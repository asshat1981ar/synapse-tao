export function generatePromptFromUI(stats: any, config: any): string {
  return \`Recent Stats: Latency=\${stats.latency}, ChunkCount=\${stats.chunkCount}, 
  Overlap=\${stats.overlap}, DBRate=\${stats.dbRate}
  Config: \${JSON.stringify(config, null, 2)}
  Proposal: Suggest config optimizations.\`;
}
