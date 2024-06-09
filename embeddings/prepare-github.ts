import fs from "node:fs";

export const HONO_ISSUES = 'data/honojs-hono.json';
export const HONO_MIDDLEWARE_ISSUES = 'data/honojs-middleware.json';


function readHonoIssues(filename: string) {
  const issues = JSON.parse(fs.readFileSync(filename, 'utf8'));
  return issues;
}

function transformIssue(issue: { id: number, title: string, body: string, html_url: string }) {
  const link = issue.html_url;
  const content = `# ${issue.title}\n${issue.body}`;

  return {
    content,
    link,
    type: "github" as const,
    sourceId: issue.id?.toString(),
  }
}

export function prepareGitHubIssues(filename: string) {
  const issues = readHonoIssues(filename);
  return issues.map(transformIssue) as Array<ReturnType<typeof transformIssue>>;
}