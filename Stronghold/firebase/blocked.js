document.addEventListener('DOMContentLoaded', async () => {
    const stats = await window.stronghold.getStats();

    if(!stats) {
        return;
    }

    const blockedURL = document.getElementById('blocked_url');
    const blockedScore = document.getElementById('blocked_score');
    const blockedReasons = document.getElementById('blocked_reasons');

    if(blockedURL) {
        blockedURL.textContent = stats.url;
    }

    if(blockedScore) {
        blockedScore.textContent = stats.score;
    }

    if(blockedReasons) {
        blockedReasons.innerHTML = '';

        (stats.reasons).forEach((reason) => {
            const reasonList = document.createElement('reason_list');
            reasonList.textContent = reason;
            blockedReasons.appendChild(list);
        });
    }
});