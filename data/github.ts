import fs from 'node:fs';

const issues = getRecentGitHubIssuesSample('data/honojs-hono.json');

fs.writeFileSync('data/honojs-hono-sample.json', JSON.stringify(issues, null, 2));

function getRecentGitHubIssuesSample(filename: string, count = 50) {
  const issuesExport = JSON.parse(fs.readFileSync(filename, 'utf8'));
  issuesExport.sort((i1, i2) => {
    const i1Date = new Date(i1.created_at);
    const i2Date = new Date(i2.created_at);
    return i2Date.getTime() - i1Date.getTime();
  });

  return issuesExport.slice(0, count);
}