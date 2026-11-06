import type { Metadata } from "next";
import { Jersey_10 } from "next/font/google";
import "./globals.css";

const jersey = Jersey_10({
  weight: "400",
  variable: "--font-jersey",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Mixtape Collection",
  description: "My mixtape collection",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jersey.variable} h-full antialiased`}
    >
      <head>
        <link
          id="favicon"
          rel="icon"
          type="image/png"
          sizes="128x128"
          href="/favicon-light.png"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  var icon = document.getElementById("favicon");
  if (!icon || !window.matchMedia) return;
  var query = window.matchMedia("(prefers-color-scheme: dark)");
  function update() {
    icon.href = query.matches ? "/favicon-dark.png" : "/favicon-light.png";
  }
  update();
  if (query.addEventListener) query.addEventListener("change", update);
  else query.addListener(update);
})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
