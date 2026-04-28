document.addEventListener('DOMContentLoaded', async () => {
    const stats = await window.stronghold.getStats();

    if(!stats) {
        return;
    }

    const warnedURL = document.getElementById('warned_url');
    const warnedScore = document.getElementById('warned_score');
    const warnedReasons = document.getElementById('warned_reasons');

    if(warnedURL) {
        warnedURL.textContent = stats.url;
    }

    if(warnedScore) {
        warnedScore.textContent = stats.score;
    }

    if(warnedReasons) {
        warnedReasons.innerHTML = '';

        (stats.reasons).forEach((reason) => {
            const reasonList = document.createElement('li');
            reasonList.textContent = reason;
            warnedReasons.appendChild(reasonList);
        });
    }
});