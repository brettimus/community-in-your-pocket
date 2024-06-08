import type { FC } from 'hono/jsx'

export const Layout: FC = (props) => (
  <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script src="https://cdn.tailwindcss.com"/>
      <title>Community in your pocket</title>
    </head>
    <body>
      <div class="p-4">
        {props.children}
      </div>
    </body>
  </html>
)

type SearchResult = {
  id: number;
  content: string;
  type: "github" | "discord" | "docs" | null;
  link: string | null;
}

export const SearchResults = ({ results }: { results: SearchResult[] }) => (
  <div className="space-y-6">
    {results.map((result) => (
      <div key={result.id} className="p-4 border rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-2">{result.type}</h3>
        <p className="mb-4">{result.content}</p>
        <a
          href={result.link ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 hover:underline"
        >
          Read more
        </a>
      </div>
    ))}
  </div>
)