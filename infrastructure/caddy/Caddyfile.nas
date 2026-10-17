:8080 {
    # 静态 txt 与根级文件
    @txt {
        path /support/cross-reference/llms.txt /support/troubleshooting/llms.txt /products/power-systems/llms.txt /products/rectifiers/llms.txt /*.txt /robots.txt
    }
    handle @txt {
        root * /mnt/vscode/hefengqi/public
        header Cache-Control "public, max-age=86400, s-maxage=86400"
        file_server
    }

    # 静态资产与切片（永久缓存）
    handle /_next/static/* {
        reverse_proxy host.docker.internal:3000 {
            header_down Cache-Control "public, max-age=31536000, immutable"
        }
    }

    handle /_next/image* {
        reverse_proxy host.docker.internal:3000 {
            header_down Cache-Control "public, max-age=31536000, immutable"
        }
    }

    handle /media/* {
        reverse_proxy host.docker.internal:3000 {
            header_down Cache-Control "public, max-age=31536000, immutable"
        }
    }

    # 管理后台与API（严格禁用缓存，确保实时）
    handle /api/admin/* {
        reverse_proxy host.docker.internal:3000 {
            header_down Cache-Control "private, no-store, max-age=0, must-revalidate"
            header_down Cdn-Cache-Control "no-store"
        }
    }

    handle /api/auth/* {
        reverse_proxy host.docker.internal:3000 {
            header_down Cache-Control "private, no-store, max-age=0, must-revalidate"
            header_down Cdn-Cache-Control "no-store"
        }
    }

    handle /admin/* {
        reverse_proxy host.docker.internal:3000 {
            header_down Cache-Control "private, no-store, max-age=0, must-revalidate"
            header_down Cdn-Cache-Control "no-store"
        }
    }

    handle /api/* {
        reverse_proxy host.docker.internal:3000 {
            header_down Cache-Control "private, no-store, max-age=0, must-revalidate"
            header_down Cdn-Cache-Control "no-store"
        }
    }

    # HTML、RSC 和统计请求不缓存；保留 Next.js 的 Vary 与连接保活。
    handle {
        reverse_proxy host.docker.internal:3000 {
            header_down Cache-Control "private, no-store, max-age=0, must-revalidate"
            header_down CDN-Cache-Control "no-store"
            transport http {
                keepalive 60s
                keepalive_idle_conns 100
            }
        }
    }

    log {
        output file /var/log/caddy/access.log {
            roll_size 50mb
            roll_keep 5
        }
        format json
    }
}
