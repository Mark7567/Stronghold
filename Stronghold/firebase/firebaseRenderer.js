import { db, auth } from "./firebaseInitialiser.js";
import { collection, getDocs } from "firebase/firestore";

async function fetchUserData() {
    const userData = await getDocs(collection(db, "user"))
    userData.forEach(entry => {

    });
}

async function fetchQuizData() {
    const quizData = await getDocs(collection(db, "quiz"));
    quizData.forEach(entry => {

    });    
}

fetchUserData();
fetchQuizData();