import { db, auth } from './firebaseInitialiser.js';
import { doc, getDoc, updateDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-auth.js';
import { googleSignIn } from './startup.js';

let stats = {
    downloadsBlocked: 0,                
    safeDayStreak: 0,
    sitesBlocked: 0,
    warningsIgnored: 0,
    xp: 0,
    completedQuizzes: 0
};

function calculateLevel(experience) {
    return Math.floor(experience / 100) + 1;
}

function getDate() {
    return new Date().toISOString().split('T')[0];
}

function getWeek() {
    const currentDate = new Date();
    const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1);
    const pastDays = (currentDate - firstDayOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);

    return `${currentDate.getFullYear()}-W${weekNumber}`;
}

async function fetchDashboardStats(user) {
    if(!user) {
        return;
    }

    const userID = doc(db, 'user', user.uid);
    const userAccount = await getDoc(userID);

    if(!userAccount.exists()) {
        return;
    }

    const userData = userAccount.data();
    await safeStreak(user, userData);

    const updatedUserAccount = await getDoc(userID);
    const updatedUserData = updatedUserAccount.data();

    stats = {
        downloadsBlocked: updatedUserData.dashboard?.downloadsBlocked,
        safeDayStreak: updatedUserData.dashboard?.safeDayStreak,
        sitesBlocked: updatedUserData.dashboard?.sitesBlocked,
        warningsIgnored: updatedUserData.dashboard?.warningsIgnored,
        warningsToday: updatedUserData.dashboard?.warningsToday,
        xp: updatedUserData.dashboard?.xp,
        completedQuizzes: updatedUserData.dashboard?.completedQuizzes,
        streakDate: updatedUserData.dashboard?.streakDate,
        blockedSites: updatedUserData.dashboard?.blockedSites ?? [],
        blockedDownloads: updatedUserData.dashboard?.blockedDownloads ?? [],
        reasonsIgnored: updatedUserData.dashboard?.reasonsIgnored ?? [],
        recentChanges: updatedUserData.dashboard?.recentChanges ?? [],
        dailyQuizDate: updatedUserData.dashboard?.dailyQuizDate,
        weeklyQuizDate: updatedUserData.dashboard?.weeklyQuizDate
    }

    statsRenderer(updatedUserData);
}

function statsRenderer(userData) {
    const username = document.getElementById('username');
    const showDownloadsBlocked = document.getElementById('show_downloads_blocked');
    const showSafeDayStreak = document.getElementById('show_safe_day_streak');
    const showSitesBlocked = document.getElementById('show_sites_blocked');
    const showWarningsIgnored = document.getElementById('show_warnings_ignored');
    const showLevel = document.getElementById('show_level');
    const xpBar = document.getElementById('xp_bar');
    const xpText = document.getElementById('xp_text');
    const level = calculateLevel(stats.xp);
    const xpLevel = stats.xp % 100;

    if(username) {
        username.textContent = userData.username;
    }

    if(showDownloadsBlocked) {
        showDownloadsBlocked.textContent = stats.downloadsBlocked;
    }

    if(showSafeDayStreak) {
        showSafeDayStreak.textContent = stats.safeDayStreak;
    }

    if(showSitesBlocked) {
        showSitesBlocked.textContent = stats.sitesBlocked;
    }

    if(showWarningsIgnored) {
        showWarningsIgnored.textContent = stats.warningsIgnored;
    }

    if(showLevel) {
        showLevel.textContent = level;
    }

    if(xpBar) {
        xpBar.style.width = `${xpLevel}%`;
    }

    if(xpText) {
        xpText.textContent = `${xpLevel} / 100 XP`;
    }

    updateQuizButton();
    renderRecentChanges();
}

document.addEventListener('DOMContentLoaded', async () => {
    showShroud();

    const signInFromDashboardButton = document.getElementById('sign_in_from_dashboard_button'); 
    if(signInFromDashboardButton) {
        signInFromDashboardButton.addEventListener('click', async () => {
            await dashboardSignIn();
        });
    }

    const sitesBlockedCard = document.getElementById('sites_blocked_card');
    if(sitesBlockedCard) {
        sitesBlockedCard.addEventListener('click', () => {
            showStats('Blocked Sites', stats.blockedSites);
        });
    }

    const downloadsBlockedCard = document.getElementById('downloads_blocked_card');
    if(downloadsBlockedCard) {
        downloadsBlockedCard.addEventListener('click', () => {
            showStats('Blocked Downloads', stats.blockedDownloads);
        });
    }
    
    const warningsIgnoredCard = document.getElementById('warnings_ignored_card');
    if(warningsIgnoredCard) {
        warningsIgnoredCard.addEventListener('click', () => {
            showStats('Warnings Ignored', stats.reasonsIgnored);
        });
    }

    const closePopupButton = document.getElementById('popup_close_button');
    const statsPopup = document.getElementById('dashboard_popup');
    if(closePopupButton) {
        closePopupButton.addEventListener('click', () => {
            statsPopup.hidden = true;
        });
    }

    const dailyQuizButton = document.getElementById('daily_quiz_button');
    if(dailyQuizButton) {
        dailyQuizButton.addEventListener('click', async () => {
            startQuiz('daily');
        });
    }

    const weeklyQuizButton = document.getElementById('weekly_quiz_button');
    if(weeklyQuizButton) {
        weeklyQuizButton.addEventListener('click', async () => {
            startQuiz('weekly');
        });
    }
    
    onAuthStateChanged(auth, async (user) => {
        if(user) {
            try {
                await fetchDashboardStats(user);
                hideShroud();
            }

            catch(e) {
                console.error('Dashboard failed', e);
                hideShroud();
            }
        }
    
        else {
            showShroud();
        }
    });
});

async function safeStreak(user, userData) {
    const currentDate = new Date().toDateString();
    const streakDate = userData.dashboard?.streakDate;
    const warningsToday = userData.dashboard?.warningsToday;
    let safeDayStreak = userData.dashboard?.safeDayStreak;

    if(streakDate === currentDate) {
        return;
    }

    if(warningsToday === 0) {
        safeDayStreak += 1;
    }

    else {
        safeDayStreak = 0;
    }

    const userID = doc(db, 'user', user.uid);

    await updateDoc(userID, {
        'dashboard.safeDayStreak': safeDayStreak,
        'dashboard.streakDate': currentDate,
        'dashboard.warningsToday': 0
    });

    stats.safeDayStreak = safeDayStreak;
    stats.streakDate = currentDate;
    stats.warningsToday = 0;
}

function renderRecentChanges() {
    const recentXpList = document.getElementById('recent_xp_changes');

    if(!recentXpList) {
        return;
    }

    recentXpList.innerHTML = '';

    const recentXpChanges = stats.recentChanges ?? [];

    if(recentXpChanges.length === 0) {
        const emptyList = document.createElement('li');
        emptyList.textContent = 'No recent XP changes';
        recentXpList.appendChild(emptyList);
        return;
    }

    recentXpChanges.slice(-5).reverse().forEach((xpChange) => {
        const change = document.createElement('li');
        const amount = xpChange.amount;
        let operator = '';

        if(amount > 0) {
            operator = '+';
        }

        const date = xpChange.date?.toDate?.();

        if(date) {
            change.textContent = `${xpChange.reason}:  ${operator}${amount} XP  --->  ${date.toLocaleDateString()}`;
        }

        else {
            change.textContent = `${xpChange.reason}: ${operator}${amount} XP`;
        }
        
        recentXpList.appendChild(change);
    })
}

function showStats(titleText, list) {
    const popup = document.getElementById('dashboard_popup');
    const popupTitle = document.getElementById('popup_title');
    const popupContent = document.getElementById('popup_content');

    popupTitle.textContent = titleText;

    if(!list || list.length === 0) {
        popupContent.innerHTML = '<p> No Stats Available </p>';
    }

    else {
        popupContent.innerHTML = `<ul> ${list.map(item => `<li> ${item.file || item.url || item.reason} </li>`).join('')} </ul>`;
    }

    popup.hidden = false;
}

async function startQuiz(type) {
    const user = auth.currentUser;

    if(!user) {
        return;
    }

    const userID = doc(db, 'user', user.uid);
    const userAccount = await getDoc(userID);

    if(!userAccount.exists()) {
        return;
    }

    const userData = userAccount.data();

    if(type === 'daily' && userData.dashboard?.dailyQuizDate === getDate()) {
        return;
    }

    if(type === 'weekly' && userData.dashboard?.weeklyQuizDate === getWeek()) {
        return;
    }

    const quizID = doc(db, 'quiz', type);
    const quizDetails = await getDoc(quizID);

    if(!quizDetails.exists()) {
        return;
    }

    const quizData = quizDetails.data();

    if(!quizData) {
        return;
    }

    let selectedQuestions = [];

    if(type === 'daily') {
        const questionSelector = Math.floor(Math.random() * quizData.questions.length);
        selectedQuestions = [quizData.questions[questionSelector]];
    }

    if(type === 'weekly') {
        selectedQuestions = [...quizData.questions].sort(() => Math.random() - 0.5).slice(0, 10);
    }

    showQuiz(type, selectedQuestions, Number(quizData.reward));
}

async function showQuiz(type, questions, reward) {
    const popup = document.getElementById('dashboard_popup');
    const popupTitle = document.getElementById('popup_title');
    const popupContent = document.getElementById('popup_content');

    let currentQuestion = 0;
    let score = 0;

    if(type === 'daily') {
        popupTitle.textContent = 'Daily Quiz';
    }

    if(type === 'weekly') {
        popupTitle.textContent = 'Weekly Quiz';
    }

    function showQuestion() {
        const question = questions[currentQuestion];

        popupContent.innerHTML = 
        `
            <p>
                Question ${currentQuestion + 1} of ${questions.length}
            </p>

            <p> 
                ${question.question}
            </p>
            
            <div id = 'answers'>
                ${question.answers.map((answer, index) => `<button class = 'answer' data-index = '${index}'> ${answer} </button>`).join('')}
            </div>
            
            <p id = 'result'>
            
            </p>
        `;

        document.querySelectorAll('.answer').forEach((button) => {
            button.addEventListener('click', async () => {
                const selectedAnswer = Number(button.dataset.index);
                const result = document.getElementById('result');

                document.querySelectorAll('.answer').forEach((button) => {
                    button.disabled = true;
                });

                if(selectedAnswer === Number(question.correctAnswer)) {
                    score++;
                    result.textContent = 'Correct!';
                }

                else {
                    result.textContent = 'Incorrect';
                }

                setTimeout(async () => {
                    currentQuestion++;

                    if(currentQuestion < questions.length) {
                        showQuestion();
                    }

                    else {
                        const finalReward = score * reward;

                        popupContent.innerHTML = 
                        `
                            <p> 
                                Quiz Complete!
                            </p>

                            <p>
                                Score: ${score} / ${questions.length}
                            </p>

                            <p>
                                XP Earned: +${finalReward}
                            </p>
                        `;

                        await giveXP(type, finalReward);
                    }
                }, 800);
            });
        });
    }

    popup.hidden = false;
    showQuestion();
}

async function giveXP(type, reward) {
    const user = auth.currentUser;

    if(!user) {
        return;
    }

    const userID = doc(db, 'user', user.uid);
    const userAccount = await getDoc(userID);
    
    if(!userAccount.exists()) {
        return;
    }

    const userData = userAccount.data();
    const stats = userData.dashboard;

    const userXP = stats.xp;
    const completedQuizzes = stats.completedQuizzes;
    const recentChanges = stats.recentChanges ?? [];
    
    let quizReason = '';
    let currentDate = '';
    let currentWeek = '';

    const updateData = {
        'dashboard.xp': userXP + reward,
        'dashboard.completedQuizzes': completedQuizzes + 1,
        'dashboard.recentChanges': updateChanges
    }

    if(type === 'daily') {
        quizReason = 'Daily quiz completed';
        updateData['dashboard.dailyQuizDate'] = getDate();
    }

    if(type === 'weekly') {
        quizReason = 'Weekly quiz completed';
        updateData['dashboard.weeklyQuizDate'] = getWeek();
    }

    const newChanges = {
        reason: quizReason,
        amount: reward,
        date: Timestamp.now()
    };

    const updateChanges = [...recentChanges, newChanges].slice(-5);
    updateData['dashboard.completedQuizzes.recentChanges'] = updateChanges;

    await updateDoc(userID, updateData);
    await fetchDashboardStats(user);
}

function updateQuizButton() {
    const currentDate = getDate();
    const currentWeek = getWeek();

    const dailyQuizButton = document.getElementById('daily_quiz_button');
    if(dailyQuizButton) {
        if(stats.dailyQuizDate === currentDate) {
            dailyQuizButton.disabled = true;
            dailyQuizButton.textContent = 'Daily Quiz Completed';
        }

        else {
            dailyQuizButton.disabled = false;
            dailyQuizButton.textContent = 'Daily Quiz';
        }
    }

    const weeklyQuizButton = document.getElementById('weekly_quiz_button');
    if(weeklyQuizButton) {
        if(stats.weeklyQuizDate === currentWeek) {
            weeklyQuizButton.disabled = true;
            weeklyQuizButton.textContent = 'Weekly Quiz Completed';
        }

        else {
            weeklyQuizButton.disabled = false;
            weeklyQuizButton.textContent = 'Weekly Quiz'
        }
    }
}

async function dashboardSignIn() {
    const user = await googleSignIn();

    if(user) {
        try {
            await fetchDashboardStats(user);
            hideShroud();
        }

        catch(e) {
            console.error('Dashboard failed', e);
            hideShroud();
        }
    }
}

function showShroud() {
    const shroud = document.getElementById('dashboard_shroud');
    if(shroud) {
        shroud.hidden = false;
    }
}

function hideShroud() {
    const shroud = document.getElementById('dashboard_shroud');
    if(shroud) {
        shroud.hidden = true;
    }
}