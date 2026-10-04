/**
 * Automated test script to verify Next.js rewrite destination normalization.
 */
import assert from 'node:assert';
import nextConfig from './next.config.mjs';

async function testRewrites() {
  const cases = [
    { name: 'Render fromService hostname', env: 'atmosync-api', expected: 'https://atmosync-api.onrender.com/api/:path*' },
    { name: 'Full HTTPS URL', env: 'https://atmosync-api.onrender.com', expected: 'https://atmosync-api.onrender.com/api/:path*' },
    { name: 'Full HTTPS URL with trailing slash', env: 'https://atmosync-api.onrender.com/', expected: 'https://atmosync-api.onrender.com/api/:path*' },
    { name: 'Full HTTPS URL with /api', env: 'https://atmosync-api.onrender.com/api', expected: 'https://atmosync-api.onrender.com/api/:path*' },
    { name: 'Custom HTTPS domain', env: 'https://custom-backend.org', expected: 'https://custom-backend.org/api/:path*' },
    { name: 'Localhost URL', env: 'http://localhost:8000', expected: 'http://localhost:8000/api/:path*' },
    { name: 'Bare localhost', env: 'localhost:8000', expected: 'http://localhost:8000/api/:path*' },
    { name: 'Empty string fallback', env: '', expected: 'http://127.0.0.1:8000/api/:path*' },
    { name: 'Undefined fallback', env: undefined, expected: 'http://127.0.0.1:8000/api/:path*' },
  ];

  for (const tc of cases) {
    if (tc.env !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = tc.env;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }

    const rewrites = await nextConfig.rewrites();
    assert.strictEqual(rewrites.length, 1, `Expected 1 rewrite rule for ${tc.name}`);
    const rule = rewrites[0];
    assert.strictEqual(rule.source, '/api/:path*', `Source mismatch for ${tc.name}`);
    assert.strictEqual(rule.destination, tc.expected, `Destination mismatch for ${tc.name}`);
    
    // Ensure destination adheres to Next.js validation requirements
    const startsWithValidPrefix = 
      rule.destination.startsWith('/') || 
      rule.destination.startsWith('http://') || 
      rule.destination.startsWith('https://');
    assert.ok(startsWithValidPrefix, `Destination does not start with valid prefix: ${rule.destination}`);
    console.log(`✓ ${tc.name} -> ${rule.destination}`);
  }

  console.log('\nAll rewrite tests passed successfully!');
}

testRewrites().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
