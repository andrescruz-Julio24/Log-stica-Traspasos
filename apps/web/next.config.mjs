const nextConfig={
  async rewrites(){
    return [{source:'/api/:path*',destination:(process.env.API_INTERNAL_URL||'http://localhost:5200')+'/api/:path*'}];
  }
};
export default nextConfig;
