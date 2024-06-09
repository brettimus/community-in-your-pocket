import fs from "node:fs";

function readHonoIssues(filename: string) {
  const issues = JSON.parse(fs.readFileSync(filename, 'utf8'));
  return issues;
}

function transformIssue(issue: { title: string, body: string, html_url: string }) {
  const link = issue.html_url;
  const content = `# ${issue.title}\n${issue.body}`;

  return {
    content,
    link,
    type: "github",
  }
}

export function prepareGitHubIssues(filename: string) {
  const issues = readHonoIssues(filename);
  return issues.map(transformIssue) // as { content: string, link: string, type: "github" }[];
}