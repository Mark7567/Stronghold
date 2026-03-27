const knownDomains = [
        'google',
        'youtube',
        'amazon',
        'microsoft',
        'github',
        'office365',
        'chatgpt',
        'paypal',
        'apple',
        'facebook',
        'instagram',
        'whatsapp',
        'linkedin',
        'netflix',
        'icloud',
        'twitter', // Redirects to X.com anyway but cannot include 'x' in the list as it makes too many false positives with short domains
        'lloydsbank',
        'halifax',
        'bankofscotland',
        'santander',
        'hsbc',
        'outlook',
        'tiktok',
        'shopify',
        'revolut',
        'monzo',
        'ebay'
    ];

module.exports = {
    knownDomains
};