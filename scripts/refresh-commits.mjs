import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const token=process.env.PROFILE_STATS_TOKEN;
const settings=JSON.parse(await readFile(path.join(root,'profile/projects.json'),'utf8'));

async function api(endpoint,body){
  const response=await fetch('https://api.github.com/'+endpoint,{
    method:body?'POST':'GET',
    headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'lux-liang-private-statistics'},
    body:body?JSON.stringify(body):undefined,
    signal:AbortSignal.timeout(60000)
  });
  if(!response.ok)throw new Error('GitHub statistics request failed: HTTP '+response.status);
  return response.status===204?[]:response.json();
}
async function pages(endpoint){
  const result=[];
  for(let page=1;;page++){
    const rows=await api(endpoint+(endpoint.includes('?')?'&':'?')+'per_page=100&page='+page);
    if(!Array.isArray(rows))throw new Error('Unexpected GitHub statistics response');
    result.push(...rows);
    if(rows.length<100)return result;
  }
}
async function graphql(query,variables){
  const result=await api('graphql',{query,variables});
  if(result.errors?.length)throw new Error('Full commit history is unavailable; the verified snapshot was preserved.');
  return result.data;
}
export function summarizeCommits(publicCommits,privateCommits){
  const all=new Set([...publicCommits,...privateCommits]);
  return {total:all.size,public:publicCommits.size,privateOnly:[...privateCommits].filter(sha=>!publicCommits.has(sha)).length};
}

async function main(){
  if(!token){
    console.log('No private statistics token configured; keeping the last verified all-commits snapshot.');
    return;
  }
  const identity=await api('user');
  if(identity.login!==settings.username)throw new Error('Statistics token must belong to the profile owner.');
  const accessible=await pages('user/repos?affiliation=owner,collaborator,organization_member');
  const repos=[...new Set([...accessible.map(repo=>repo.full_name),...settings.candidates.map(repo=>repo.repo),...settings.research.map(repo=>repo.repo)])];
  const publicCommits=new Set(),privateCommits=new Set();
  const query='query($owner:String!,$name:String!,$author:ID!,$after:String){repository(owner:$owner,name:$name){isPrivate refs(refPrefix:"refs/heads/",first:50,after:$after){pageInfo{hasNextPage endCursor} nodes{target{... on Commit{oid history(first:100,author:{id:$author}){pageInfo{hasNextPage endCursor} nodes{oid}}}}}}}}';
  const historyQuery='query($owner:String!,$name:String!,$author:ID!,$oid:GitObjectID!,$after:String!){repository(owner:$owner,name:$name){object(oid:$oid){... on Commit{history(first:100,author:{id:$author},after:$after){pageInfo{hasNextPage endCursor} nodes{oid}}}}}}';
  let next=0,completed=0;
  async function worker(){
    while(next<repos.length){
      const [owner,name]=repos[next++].split('/');
      let after=null;
      do{
        const data=await graphql(query,{owner,name,author:identity.node_id,after});
        if(!data.repository)throw new Error('A repository is unavailable; the verified snapshot was preserved.');
        const destination=data.repository.isPrivate?privateCommits:publicCommits;
        for(const branch of data.repository.refs.nodes){
          let history=branch.target.history;
          if(!history)continue;
          for(;;){
            for(const commit of history.nodes)destination.add(commit.oid);
            if(!history.pageInfo.hasNextPage)break;
            const result=await graphql(historyQuery,{owner,name,author:identity.node_id,oid:branch.target.oid,after:history.pageInfo.endCursor});
            history=result.repository.object.history;
          }
        }
        after=data.repository.refs.pageInfo.hasNextPage?data.repository.refs.pageInfo.endCursor:null;
      }while(after);
      completed++;
      if(completed%25===0)console.log('Checked '+completed+' repository histories.');
    }
  }
  await Promise.all([worker(),worker(),worker()]);
  const counts=summarizeCommits(publicCommits,privateCommits);
  const snapshot={username:settings.username,...counts,updatedAt:new Date().toISOString(),scope:'All accessible GitHub repositories and all branches; author-linked commits, deduplicated by SHA'};
  await writeFile(path.join(root,'profile/commits.json'),JSON.stringify(snapshot,null,2)+'\n');
  console.log(JSON.stringify({total:counts.total,includesPrivate:true}));
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url))await main();
