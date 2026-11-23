export default {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:3101/api/v1/:path*",
      },
    ];
  },
};
