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