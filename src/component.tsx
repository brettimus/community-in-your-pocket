import type { FC } from 'hono/jsx'
import { marked } from 'marked';

const renderer = new marked.Renderer();

renderer.heading = (text, level) => {
  const baseClass = 'font-bold mb-2';
  const sizes = {
    1: 'text-2xl',
    2: 'text-xl',
    3: 'text-lg',
    4: 'text-base',
    5: 'text-base',
    6: 'text-base',
  };

  const sizeClass = sizes[level] || sizes[6];
  return `<h${level} class="${baseClass} ${sizeClass}">${text}</h${level}>`;
};

renderer.paragraph = text => {
  return `<p class="mb-4">${text}</p>`;
};

renderer.link = (href, title, text) => {
  return `<a href="${href}" title="${title || ''}" class="text-blue-500 hover:underline">${text}</a>`;
};


renderer.code = (code, infostring, escaped) => {
  return `<pre class="bg-gray-100 p-2 rounded-md overflow-auto"><code class="text-red-800 font-mono">${code}</code></pre>`;
};

renderer.codespan = (code) => {
  return `<code class="bg-gray-100 text-red-500 font-mono rounded px-1">${code}</code>`;
};

marked.setOptions({
  renderer,
  async: false,
});

export const Layout: FC = (props) => (
  <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script src="https://cdn.tailwindcss.com" />
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

export const SearchForm = () => (
  <form method="get" action="/knowledge/search" className="flex items-center space-x-4">
    <label htmlFor="similarity" className="text-lg font-medium">Similarity:</label>
    <input
      type="number"
      id="similarity"
      name="similarity"
      min="0"
      max="1"
      step="0.1"
      className="w-20 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300 text-mono"
      defaultValue="0.5"
      value="0.5"
    />
    <input
      type="text"
      name="query"
      className="flex-grow px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
      placeholder="Enter your query"
    />
    <button
      type="submit"
      className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
    >
      Search
    </button>
  </form>
)

export const SearchResults = ({ results }: { results: SearchResult[] }) => {
  return (
    <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
      {results.map((result) => (
        <div key={result.id} className="p-4 border rounded-lg shadow-sm">
          <div className="inline-block px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded mb-2">
            {result.type}
          </div>          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation> */}
          <div className="mb-4" dangerouslySetInnerHTML={{ __html: marked(result.content) as string }} />
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
}