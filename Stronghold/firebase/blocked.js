document.addEventListener('DOMContentLoaded', async () => {
    const stats = await window.stronghold.getStats();

    if(!stats) {
        return;
    }

    const blockedURL = document.getElementById('blocked_url');
    const blockedScore = document.getElementById('blocked_score');
    const blockedReasons = document.getElementById('blocked_reasons');

    // Shows the user the URL that is blocked
    if(blockedURL) {
        blockedURL.textContent = stats.url;
    }

    // Shows the user the risk score for the URL that is blocked
    if(blockedScore) {
        blockedScore.textContent = stats.score;
    }

    // Shows the reasons why the URL was blocked
    if(blockedReasons) {
        blockedReasons.innerHTML = '';

        (stats.reasons).forEach((reason) => {
            const reasonList = document.createElement('li');
            reasonList.textContent = reason;
            blockedReasons.appendChild(reasonList);
        });
    }
});