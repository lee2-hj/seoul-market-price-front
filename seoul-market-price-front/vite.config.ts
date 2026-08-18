import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'


export default defineConfig({

    plugins:[
        react(),
        tailwindcss()
    ],


    resolve:{

        alias:{

            '@': fileURLToPath(new URL('./src', import.meta.url))

        }

    },


    server:{

        host:"0.0.0.0",

        port:3000,

        proxy: {
            "/api": {
                target: "http://localhost:8081",
                changeOrigin: true,
                secure: false,
            },
        },

    },


    build:{

        // 소스맵을 만들지 않아 배포본 브라우저 소스탭에 api.ts 등 원본 코드가 노출되지 않도록 한다.
        sourcemap: false

    }

})