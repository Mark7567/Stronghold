// List of common domains used to check for typosquatting
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

// List of extensions which are typically malicious and should be instantly blocked
const blockedExtensions = [
    '.cmd',
    '.ps1',
    '.bat',
    '.js'
];

// List of words commonly used in phishing links / attacks
const phishingWords = [
    'login',
    'secure',
    'verification'
];

// List of url endings to check if a Google search query is needed
const validEndings = [
    '.com',
    '.co.uk',
    '.org',
    '.net',
    '.edu',
    '.gov',
    '.uk',
    '.tv'
];

// Exports to take lists from here into main.js
module.exports = {
    knownDomains,
    blockedExtensions,
    phishingWords,
    validEndings
};