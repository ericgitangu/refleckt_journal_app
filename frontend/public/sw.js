if(!self.define){let e,s={};const a=(a,c)=>(a=new URL(a+".js",c).href,s[a]||new Promise((s=>{if("document"in self){const e=document.createElement("script");e.src=a,e.onload=s,document.head.appendChild(e)}else e=a,importScripts(a),s()})).then((()=>{let e=s[a];if(!e)throw new Error(`Module ${a} didn’t register its module`);return e})));self.define=(c,i)=>{const n=e||("document"in self?document.currentScript.src:"")||location.href;if(s[n])return;let t={};const o=e=>a(e,n),f={module:{uri:n},exports:t,require:o};s[n]=Promise.all(c.map((e=>f[e]||o(e)))).then((e=>(i(...e),t)))}}define(["./workbox-f1770938"],(function(e){"use strict";importScripts(),self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"/_next/static/chunks/103-96c96da9ac432146.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/147-a0be48e1983d632d.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/2-58c7d6fbb05fe6c5.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/250-1d94db88e796fa21.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/266-400100a01fba2998.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/319-5b1018e0c43112d1.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/360-b5cd0a19782902da.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/404-2c14e3d92f28c26c.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/533-101dfa7304c04e06.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/555-eb4c60e6c09c536d.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/657.74f6fc418d0d4fcf.js",revision:"74f6fc418d0d4fcf"},{url:"/_next/static/chunks/67-e318404245576168.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/703-4527d30c7ffb51d0.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/749-9b98fbbae3b7538d.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/759-c640674ae5d7b695.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/849-b49729d3a153c8ca.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/aaea2bcf-a0b37da2d706eb51.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/ai-insights/page-7f9a53f6255f9060.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/analytics/page-5904f3f973fbdb4b.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/api/error/page-2436f8cf64a7901c.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/auth/error/page-d21bba843e838178.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/debug/page-f9f3c4d4aff6fbf2.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/error-60987926685cd13b.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/global-error-1714deda9717ade4.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/health/page-677961a1635f4550.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/journal/%5Bid%5D/page-2d16de2a74e0aba1.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/journal/layout-223fefb4471a1845.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/journal/new/page-54c7bb9b4bf64df9.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/journal/page-e058ef37886772f3.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/journal/prompts/page-1cee6c38f5c6a4cb.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/layout-7fae045d2f1d46f2.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/login/page-4902b68ea135a5b2.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/logout/page-99ffd4865442b2b7.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/not-found-fb9914f464d93b11.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/page-8501032b9de6be5a.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/prompts/page-6481078e60e67fbd.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/settings/page-25de2bfadc8806c1.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/app/signup/page-399e05f819d42144.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/fd9d1056-ea657d1efccdf6b2.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/framework-43665103d101a22d.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/main-app-d904bfedf88cf0aa.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/main-d1e313d64c6d3df3.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/pages/_app-8e650e1c50ef0819.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/pages/_error-0ffac66cb3fae446.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/chunks/polyfills-c67a75d1b6f99dc8.js",revision:"837c0df77fd5009c9e46d446188ecfd0"},{url:"/_next/static/chunks/webpack-91ac126013600d07.js",revision:"oIbHfsaFTY5ALFchwE4zp"},{url:"/_next/static/css/b43d7745731ba6e5.css",revision:"b43d7745731ba6e5"},{url:"/_next/static/media/021bc4481ed92ece-s.woff2",revision:"0f5cb8880dd308345f58cecdc5fc5041"},{url:"/_next/static/media/26a46d62cd723877-s.woff2",revision:"befd9c0fdfa3d8a645d5f95717ed6420"},{url:"/_next/static/media/3f69592b2fe603c7-s.woff2",revision:"84568c0a37620328592a78e9ad069d77"},{url:"/_next/static/media/4f05ba3a6752a328-s.p.woff2",revision:"ea21cc6e4b393851204d1a3160ad6abc"},{url:"/_next/static/media/55c55f0601d81cf3-s.woff2",revision:"43828e14271c77b87e3ed582dbff9f74"},{url:"/_next/static/media/581909926a08bbc8-s.woff2",revision:"f0b86e7c24f455280b8df606b89af891"},{url:"/_next/static/media/6325a8417175c41d-s.woff2",revision:"a3fd0c427e31c0cadb48607ee8c7876b"},{url:"/_next/static/media/6d93bde91c0c2823-s.woff2",revision:"621a07228c8ccbfd647918f1021b4868"},{url:"/_next/static/media/97e0cb1ae144a2a9-s.woff2",revision:"e360c61c5bd8d90639fd4503c829c2dc"},{url:"/_next/static/media/99b7f73d5af7c3e2-s.woff2",revision:"e94b5e20c27aefc321077e0493d637fa"},{url:"/_next/static/media/a34f9d1faa5f3315-s.p.woff2",revision:"d4fe31e6a2aebc06b8d6e558c9141119"},{url:"/_next/static/media/df0a9ae256c0569c-s.woff2",revision:"d54db44de5ccb18886ece2fda72bdfe0"},{url:"/_next/static/oIbHfsaFTY5ALFchwE4zp/_buildManifest.js",revision:"e50bd43c906648e2a1ccbe057d6ceadb"},{url:"/_next/static/oIbHfsaFTY5ALFchwE4zp/_ssgManifest.js",revision:"b6652df95db52feb4daf4eca35380933"},{url:"/android-chrome-192x192.png",revision:"fa075ca24f2e921a6b2b2f0f8551f4d2"},{url:"/android-chrome-512x512.png",revision:"8aebad2f381df62a19bd4c8d8b65ae5f"},{url:"/apple-touch-icon.png",revision:"7e83e4f6ce810b5ba1c1505878785b9e"},{url:"/favicon-16x16.png",revision:"4c42e0270dfaf755751ff211b9e86962"},{url:"/favicon-32x32.png",revision:"603defd046cc30ad91cf6ff8b4ef48a9"},{url:"/favicon.ico",revision:"9b40a04c04d5f2823f3c568fb0b8b3f6"},{url:"/file.svg",revision:"d09f95206c3fa0bb9bd9fefabfd0ea71"},{url:"/globe.svg",revision:"2aaafa6a49b6563925fe440891e32717"},{url:"/icons/compose.svg",revision:"9a50718cbad70249c5c964800b0fbdee"},{url:"/icons/icon.svg",revision:"220aa6733a81173afcd46c1e74574c65"},{url:"/icons/journal.svg",revision:"d4079ae3d398638f01b13a0530e7f32b"},{url:"/images/google-logo.svg",revision:"77203b98ef13a5951b4f7e413e722758"},{url:"/logo.jpg",revision:"d1251f3aceee307251043fc88b95f9d7"},{url:"/manifest.json",revision:"94b072a570dfedc933f69e4c22fa10ac"},{url:"/next.svg",revision:"8e061864f388b47f33a1c3780831193e"},{url:"/opengraph-image.jpg",revision:"d1251f3aceee307251043fc88b95f9d7"},{url:"/robots.txt",revision:"d7f82058e16aaecdab1b66e3fb044e81"},{url:"/screenshots/journal.png",revision:"851e2a710820b9567136f513041b83cb"},{url:"/site.webmanifest",revision:"a20fc28eb8609e28307a09f8ed0f7479"},{url:"/vercel.svg",revision:"c0af2f507b369b085b35ef4bbe3bcf1e"},{url:"/window.svg",revision:"a2760511c65806022ad20adf74370ff3"}],{ignoreURLParametersMatching:[/^utm_/,/^fbclid$/]}),e.cleanupOutdatedCaches(),e.registerRoute("/",new e.NetworkFirst({cacheName:"start-url",plugins:[{cacheWillUpdate:async({response:e})=>e&&"opaqueredirect"===e.type?new Response(e.body,{status:200,statusText:"OK",headers:e.headers}):e}]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,new e.CacheFirst({cacheName:"google-fonts-webfonts",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:31536e3})]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,new e.StaleWhileRevalidate({cacheName:"google-fonts-stylesheets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,new e.StaleWhileRevalidate({cacheName:"static-font-assets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,new e.StaleWhileRevalidate({cacheName:"static-image-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:2592e3})]}),"GET"),e.registerRoute(/\/_next\/static.+\.js$/i,new e.CacheFirst({cacheName:"next-static-js-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/image\?url=.+$/i,new e.StaleWhileRevalidate({cacheName:"next-image",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp3|wav|ogg)$/i,new e.CacheFirst({cacheName:"static-audio-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp4|webm)$/i,new e.CacheFirst({cacheName:"static-video-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:js)$/i,new e.StaleWhileRevalidate({cacheName:"static-js-assets",plugins:[new e.ExpirationPlugin({maxEntries:48,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:css|less)$/i,new e.StaleWhileRevalidate({cacheName:"static-style-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/data\/.+\/.+\.json$/i,new e.StaleWhileRevalidate({cacheName:"next-data",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:json|xml|csv)$/i,new e.NetworkFirst({cacheName:"static-data-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute((({sameOrigin:e,url:{pathname:s}})=>!(!e||s.startsWith("/api/auth/callback")||!s.startsWith("/api/"))),new e.NetworkFirst({cacheName:"apis",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:16,maxAgeSeconds:86400})]}),"GET"),e.registerRoute((({request:e,url:{pathname:s},sameOrigin:a})=>"1"===e.headers.get("RSC")&&"1"===e.headers.get("Next-Router-Prefetch")&&a&&!s.startsWith("/api/")),new e.NetworkFirst({cacheName:"pages-rsc-prefetch",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute((({request:e,url:{pathname:s},sameOrigin:a})=>"1"===e.headers.get("RSC")&&a&&!s.startsWith("/api/")),new e.NetworkFirst({cacheName:"pages-rsc",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute((({url:{pathname:e},sameOrigin:s})=>s&&!e.startsWith("/api/")),new e.NetworkFirst({cacheName:"pages",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute((({sameOrigin:e})=>!e),new e.NetworkFirst({cacheName:"cross-origin",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:3600})]}),"GET")}));
