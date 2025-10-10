/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tradeclarity-backend-r612dddom-kkeelors-projects.vercel.app'
  }
}

module.exports = nextConfig