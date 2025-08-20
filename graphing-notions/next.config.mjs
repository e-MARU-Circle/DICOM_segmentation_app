/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // すべてのAPIルートに適用
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          // ここで許可するオリジンを指定します。'*'はすべてを許可しますが、開発時のみに留めるのが安全です。
          { key: "Access-Control-Allow-Origin", value: "*" }, 
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  }
};

export default nextConfig;
