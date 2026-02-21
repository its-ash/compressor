import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  ssr: true,

  devtools: { enabled: false },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
      htmlAttrs: {
        lang: 'en'
      },
      meta: [
        // Basic SEO
        {
          name: 'description',
          content: 'Free online WASM tools for image editing, compression, file handling, regex testing, video processing, code compilation, and AI chat. Everything runs locally on your device—no uploads, no tracking, no servers.'
        },
        {
          name: 'keywords',
          content: 'image compression, crop tool, WASM, WebAssembly, video converter, file compression, regex tester, code sandbox, AI chat, local processing, privacy-first'
        },
        {
          name: 'author',
          content: 'Ash Kumar'
        },
        {
          name: 'creator',
          content: 'Ash Kumar'
        },
        {
          name: 'theme-color',
          content: '#0f172a'
        },
        {
          name: 'color-scheme',
          content: 'dark'
        },
        // Robots
        {
          name: 'robots',
          content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
        },
        // Google
        {
          name: 'google-site-verification',
          content: 'verification-code-here'
        },
        // Apple
        {
          name: 'apple-mobile-web-app-capable',
          content: 'yes'
        },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent'
        },
        {
          name: 'apple-mobile-web-app-title',
          content: 'Local WASM Tools'
        },
        // Microsoft
        {
          name: 'msapplication-TileColor',
          content: '#0f172a'
        },
        // Open Graph
        {
          property: 'og:type',
          content: 'website'
        },
        {
          property: 'og:title',
          content: 'Local WASM Tools | Free Online Tools'
        },
        {
          property: 'og:description',
          content: 'Free online WASM tools for image editing, compression, file handling, regex testing, video processing, code compilation, and AI chat. Everything runs locally on your device.'
        },
        {
          property: 'og:url',
          content: 'https://ash-tools.com'
        },
        {
          property: 'og:image',
          content: '/og-image.png'
        },
        {
          property: 'og:image:width',
          content: '1200'
        },
        {
          property: 'og:image:height',
          content: '630'
        },
        {
          property: 'og:locale',
          content: 'en_US'
        },
        // Twitter Card
        {
          name: 'twitter:card',
          content: 'summary_large_image'
        },
        {
          name: 'twitter:title',
          content: 'Local WASM Tools | Free Online Tools'
        },
        {
          name: 'twitter:description',
          content: 'Free online WASM tools for image editing, compression, file handling, regex testing, video processing, code compilation, and AI chat. Everything runs locally on your device.'
        },
        {
          name: 'twitter:image',
          content: '/twitter-image.png'
        },
        {
          name: 'twitter:creator',
          content: '@ashvinijangid'
        },
        // Additional SEO
        {
          name: 'revisit-after',
          content: '7 days'
        },
        {
          name: 'language',
          content: 'English'
        },
        {
          httpEquiv: 'X-UA-Compatible',
          content: 'IE=edge'
        }
      ],
      link: [
        {
          rel: 'icon',
          href: '/icon.gif',
          type: 'image/gif',
        },
        {
          rel: 'canonical',
          href: 'https://ash-tools.com'
        },
        {
          rel: 'alternate',
          hreflang: 'en',
          href: 'https://ash-tools.com'
        },
        {
          rel: 'apple-touch-icon',
          href: '/apple-touch-icon.png'
        },
        {
          rel: 'manifest',
          href: '/manifest.json'
        }
      ],
      script: [
        // Google Tag Manager (gtag.js)
        {
          src: 'https://www.googletagmanager.com/gtag/js?id=G-GVC5N24NVF',
          async: true,
        },
        {
          innerHTML: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GVC5N24NVF');
          `,
        },
        // Google AdSense
        {
          src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9899193996105785',
          async: true,
          crossorigin: 'anonymous',
        }
      ]
    }
  },

  routeRules: {
    '/**': { prerender: true }
  },

  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: true,
      routes: ['/', '/image', '/zip', '/video', '/webllm', '/speed', '/regexp', '/sandbox', '/sitemap.xml', '/robots.txt']
    },
    output: {
      publicDir: './docs'
    },
    storage: {
      db: { driver: 'memory' }
    }
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
    assetsInclude: ['**/*.wasm'],
  },

  compatibilityDate: '2024-11-01',
})
