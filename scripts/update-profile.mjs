import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(root, 'profile/projects.json'), 'utf8'));
const key = value => value.toLowerCase();
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const number = value => value.toLocaleString('en-US');

async function request(endpoint) {
  const response = await fetch('https://api.github.com/' + endpoint, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      'User-Agent': 'lux-liang-profile',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(endpoint + ': HTTP ' + response.status);
  return response.status === 204 ? [] : response.json();
}

async function pages(endpoint) {
  const result = [];
  for (let page = 1; ; page++) {
    const rows = await request(endpoint + (endpoint.includes('?') ? '&' : '?') + 'per_page=100&page=' + page);
    if (!Array.isArray(rows)) throw new Error('Expected an array from ' + endpoint);
    result.push(...rows);
    if (rows.length < 100) return result;
  }
}

async function collect() {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
  const rows = [];
  const projects = [...new Map([...config.candidates, ...config.research].map(spec => [key(spec.repo), spec])).values()];
  let cursor = 0;
  async function worker() {
    while (cursor < projects.length) {
      const spec = projects[cursor++];
      const meta = await request('repos/' + spec.repo);
      if (meta.private || meta.fork) continue;
      const contributors = await pages('repos/' + meta.full_name + '/contributors');
      const contributorIndex = contributors.findIndex(person => key(person.login || '') === key(config.username));
      const contributor = contributors[contributorIndex];
      rows.push({
        repo: spec.repo, canonical: meta.full_name, owner: meta.owner.login,
        stars: meta.stargazers_count, language: meta.language, private: meta.private, fork: meta.fork,
        confirmed: Boolean(contributor && contributor.contributions > 0),
        commits: contributor?.contributions || 0,
        contributorRank: contributorIndex < 0 ? null : contributorIndex + 1
      });
    }
  }
  await Promise.all(Array.from({length: 4}, worker));
  const owned = (await pages('users/' + config.username + '/repos?type=owner')).filter(repo => !repo.private && !repo.fork);
  let ownedCursor = 0;
  async function ownedWorker() {
    while (ownedCursor < owned.length) {
      const repo = owned[ownedCursor++];
      const contributors = await request('repos/' + repo.full_name + '/contributors?per_page=5');
      if (!Array.isArray(contributors)) throw new Error('Expected contributors for ' + repo.full_name);
      const contributorIndex = contributors.findIndex(person => key(person.login || '') === key(config.username));
      rows.push({
        repo: repo.full_name, canonical: repo.full_name, owner: repo.owner.login,
        stars: repo.stargazers_count, language: repo.language, private: repo.private, fork: repo.fork,
        commits: contributors[contributorIndex]?.contributions || 0,
        contributorRank: contributorIndex < 0 ? null : contributorIndex + 1
      });
    }
  }
  await Promise.all(Array.from({length: 4}, ownedWorker));
  return rows;
}

export function selectProjects(rows, settings) {
  const candidates = new Map(settings.candidates.map(spec => [key(spec.repo), spec]));
  const contributed = [...new Map(rows.filter(row =>
    !row.private && !row.fork && row.confirmed === true && row.commits > 0 &&
    key(row.owner) !== key(settings.username) && candidates.has(key(row.repo))
  ).map(row => [key(row.canonical || row.repo), {...row, ...candidates.get(key(row.repo)), repo: row.canonical || row.repo}])).values()]
    .sort((a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo));
  const starCandidates = new Set([...settings.candidates, ...(settings.research || [])].map(spec => key(spec.repo)));
  const starRepos = new Map(rows.filter(row =>
    !row.private && !row.fork &&
    (key(row.owner) === key(settings.username) || (row.confirmed === true && starCandidates.has(key(row.repo)))) &&
    row.commits > 0 && Number.isInteger(row.contributorRank) && row.contributorRank >= 1 && row.contributorRank <= 5
  ).map(row => [key(row.canonical || row.repo), row]));
  const languages = new Map();
  for (const row of contributed) if (row.language) languages.set(row.language, (languages.get(row.language) || 0) + 1);
  return {
    contributed, featured: contributed.slice(0, settings.featuredCount),
    starProjects: [...starRepos.values()],
    stars: [...starRepos.values()].reduce((sum, row) => sum + row.stars, 0),
    commits: contributed.reduce((sum, row) => sum + row.commits, 0),
    languages: [...languages].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  };
}

function shell(width, title, description, body, dark) {
  const palette = dark
    ? {title:'#f0b4bb', text:'#c9d1d9', muted:'#8b949e', bg:'#0d1117', border:'#30363d'}
    : {title:'#9f171b', text:'#434343', muted:'#6e7781', bg:'#ffffff', border:'#ead5d5'};
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="195" viewBox="0 0 ' + width + ' 195" role="img" aria-labelledby="title desc">',
    '<title id="title">' + escape(title) + '</title><desc id="desc">' + escape(description) + '</desc>',
    '<style>text{font-family:"Segoe UI",Ubuntu,Arial,sans-serif}.title{font-size:18px;font-weight:600;fill:' + palette.title + '}.label{font-size:12px;fill:' + palette.text + '}.muted{font-size:10.5px;fill:' + palette.muted + '}</style>',
    '<rect x=".5" y=".5" width="' + (width - 1) + '" height="194" rx="12" fill="' + palette.bg + '" stroke="' + palette.border + '"/>',
    body(palette), '</svg>\n'
  ].join('\n');
}

function statsCard(data, dark) {
  return shell(467, config.name + "'s GitHub Stats",
    'Top-5 Project Stars: ' + data.stars + '. Sum of public, non-fork repositories where ' + config.username + ' appears among the first five contributors ranked by commits, each repository counted once. Contributed projects: ' + data.contributed.length + '. Total Commits: ' + data.allCommits.total + ', including private repositories, all accessible branches, deduplicated by SHA; verified on ' + data.allCommits.updatedAt.slice(0,10) + '. Primary languages: ' + data.languages.length + '.',
    palette => {
      const rows = [
        ['Top-5 Project Stars', number(data.stars)],
        ['Contributed Projects', data.contributed.length],
        ['Total Commits (incl. private)', number(data.allCommits.total)],
        ['Project Languages', data.languages.length]
      ];
      return [
        '<text x="25" y="35" class="title">' + escape(config.name + "'s GitHub Stats") + '</text>',
        '<text x="25" y="53" class="muted">Stars from projects where I am a top-5 contributor</text>',
        ...rows.map(([label, value], i) =>
          '<circle cx="30" cy="' + (78 + i * 29) + '" r="3" fill="' + palette.title + '"/>' +
          '<text x="42" y="' + (82 + i * 29) + '" class="label" font-weight="600">' + label + '</text>' +
          '<text x="266" y="' + (82 + i * 29) + '" class="label" font-weight="700">' + value + '</text>'),
        '<circle cx="399" cy="119" r="36" fill="none" stroke="' + palette.border + '" stroke-width="5"/>',
        '<path d="m399 96 7 15 17 2-12 12 3 17-15-8-15 8 3-17-12-12 17-2Z" fill="none" stroke="' + palette.title + '" stroke-width="3" stroke-linejoin="round"/>'
      ].join('\n');
    }, dark);
}

function languagesCard(data, dark) {
  const colors = {Python:'#3572A5', Go:'#00ADD8', JavaScript:'#f1e05a', TypeScript:'#3178c6', Java:'#b07219', Rust:'#dea584'};
  const total = data.languages.reduce((sum, [, count]) => sum + count, 0);
  return shell(330, 'Project Languages', 'Primary languages across ' + data.contributed.length + ' verified contributor projects. Each project counts once.', palette => {
    let x = 25;
    const bars = data.languages.map(([language, count]) => {
      const width = total ? 280 * count / total : 0;
      const result = '<rect x="' + x + '" y="66" width="' + width + '" height="8" fill="' + (colors[language] || '#888') + '"/>';
      x += width;
      return result;
    });
    return [
      '<text x="25" y="35" class="title">Project Languages</text>',
      '<text x="25" y="52" class="muted">Primary language · ' + data.contributed.length + ' contributed projects</text>',
      '<defs><clipPath id="bar"><rect x="25" y="66" width="280" height="8" rx="4"/></clipPath></defs>',
      '<g clip-path="url(#bar)">' + bars.join('') + '</g>',
      ...data.languages.slice(0, 8).map(([language, count], i) => {
        const lx = 25 + (i % 2) * 145, ly = 102 + Math.floor(i / 2) * 24;
        const pct = (count * 100 / total).toFixed(2).replace(/\.?0+$/, '');
        return '<circle cx="' + (lx + 5) + '" cy="' + (ly - 4) + '" r="5" fill="' + (colors[language] || '#888') + '"/>' +
          '<text x="' + (lx + 17) + '" y="' + ly + '" class="label">' + escape(language) + ' <tspan fill="' + palette.muted + '">' + pct + '%</tspan></text>';
      })
    ].join('\n');
  }, dark);
}

function readme(data) {
  const picture = (name, alt) => [
    '    <picture>',
    '      <source media="(prefers-color-scheme: dark)" srcset="./assets/' + name + '-dark.svg">',
    '      <img height="180" src="./assets/' + name + '.svg" alt="' + alt + '">',
    '    </picture>'
  ].join('\n');
  return [
    '<h1 align="center">' + config.name + ' · ' + config.username + '</h1>', '',
    '<p align="center">', '  Open-source systems · LLM infrastructure · Developer tools', '</p>', '',
    '<p align="center">',
    '  <a href="https://github.com/' + config.username + '">',
    picture('github-stats', 'Stars from projects where I am a top-five contributor'), '  </a>',
    '  <a href="#contributed-projects-selected">',
    picture('project-languages', 'Primary languages of verified contributor projects'), '  </a>',
    '</p>', '',
    'Star totals include only public, non-fork projects where I appear among the top five contributors, ranked by commits.', '',
    '## Contributed Projects (Selected)', '',
    '| Project | Stars | Overview |', '| :--- | :---: | :--- |',
    ...data.featured.map(row =>
      '| [' + row.name + '](https://github.com/' + row.repo + ') | [![Stars](https://img.shields.io/github/stars/' + row.repo +
      '?style=flat-square&label=%E2%98%85&color=9f171b&labelColor=f3eeee)](https://github.com/' + row.repo + '/stargazers) | ' + row.description + ' |'),
    '', '## Research Projects', '',
    '| Project | Role | Overview |', '| :--- | :---: | :--- |',
    ...config.research.map(row => '| [' + row.name + '](https://github.com/' + row.repo + ') | **' + row.role + '** | ' + row.description + ' [Paper](' + row.paper + ') |'),
    ''
  ].join('\n');
}

async function main() {
  const snapshot = process.argv.indexOf('--snapshot');
  const rows = snapshot < 0 ? await collect() : JSON.parse(await readFile(process.argv[snapshot + 1], 'utf8')).projects;
  const data = selectProjects(rows, config);
  data.allCommits = JSON.parse(await readFile(path.join(root, 'profile/commits.json'), 'utf8'));
  if (data.allCommits.username !== config.username || !Number.isSafeInteger(data.allCommits.total) || data.allCommits.total < 0) throw new Error('Invalid all-commits snapshot');
  if (!data.contributed.length || !data.featured.length) throw new Error('No confirmed projects; keeping previous profile');
  const files = new Map([['README.md', readme(data)]]);
  for (const dark of [false, true]) {
    const suffix = dark ? '-dark' : '';
    files.set('assets/github-stats' + suffix + '.svg', statsCard(data, dark));
    files.set('assets/project-languages' + suffix + '.svg', languagesCard(data, dark));
  }
  await mkdir(path.join(root, 'assets'), {recursive: true});
  for (const [file, contents] of files) await writeFile(path.join(root, file), contents);
  console.log(JSON.stringify({stars:data.stars, starProjects:data.starProjects.map(row => ({repo:row.canonical || row.repo, rank:row.contributorRank, stars:row.stars})), confirmedProjects:data.contributed.length, featured:data.featured.map(row => row.repo), commits:data.commits}));
}
if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) await main();
