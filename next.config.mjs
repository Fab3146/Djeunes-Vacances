/** @type {import('next').NextConfig} */
const nextConfig={reactStrictMode:true,outputFileTracingIncludes:{"/voyage/*":["./src/argentine/shell.html"],"/apercu":["./src/argentine/shell.html"]},async headers(){return [{source:"/:path*",headers:[{key:"Referrer-Policy",value:"no-referrer"},{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Robots-Tag",value:"noindex, nofollow"}]}];}};
export default nextConfig;
