const LEETCODE_API_URL = 'https://leetcode.com/graphql';
const LEETCODE_USER = 'nikuz';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';
const API_URL = 'https://ruby-cheerful-spider.cyclic.app';

const buttonEl = document.getElementById('sync-btn');
const loadingEl = document.getElementById('loading');
const successEl = document.getElementById('success');
const errorEl = document.getElementById('error');
const storageKey = 'leetcode-counter';
let counter = 0;

buttonEl.onclick = async function () {
    const cookieStores = await chrome.cookies.getAllCookieStores();
    let cookieString = '';

    for (const store of cookieStores) {
        const cookies = await chrome.cookies.getAll({
            storeId: store.id,
        });
        for (const cookie of cookies) {
            cookieString += `${cookieString.length > 0 ? ';' : ''}${cookie.name}=${cookie.value}`;
        }
    }

    if (cookieString) {
        showLoading();
        fetch(LEETCODE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieString,
                'Referer': LEETCODE_API_URL,
                'User-Agent': USER_AGENT,
            },
            body: JSON.stringify({
                variables: {
                    username: LEETCODE_USER,
                },
                query: `
                query ($username: String!) {
                    matchedUser(username: $username) {
                        username
                        submitStats {
                            acSubmissionNum {
                                difficulty
                                count
                                submissions
                            }
                        }
                    }
                }
            `,
            }),
        }).then(response => response.json()).then(({ data }) => {
            const allSubmissions = data.matchedUser.submitStats.acSubmissionNum.find(item => (
                item.difficulty === 'All'
            ));
            if (allSubmissions) {
                fetch(`${API_URL}/sync-total-solved`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        cookie: cookieString,
                        totalSolved: allSubmissions.count,
                    }),
                }).then(() => {
                    showSuccess(allSubmissions.count);
                }).catch(showError);
            } else {
                showError(new Error('Can\'t retrieve allSubmissions count from leetcode response'));
            }
        }).catch(showError);
    }
}

function showLoading() {
    successEl.style.display = 'none';
    errorEl.style.display = 'none';
    errorEl.innerText = '';
    loadingEl.style.display = 'block';
}

function showSuccess(value) {
    counter = value
    localStorage.setItem(storageKey, value.toString());
    loadingEl.style.display = 'none';
    errorEl.style.display = 'none';
    successEl.innerText = counter;
    successEl.style.display = 'block';
}

function showError(error) {
    loadingEl.style.display = 'none';
    successEl.style.display = 'none';
    errorEl.innerText = error.message;
    errorEl.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function() {
    counter = Number(localStorage.getItem(storageKey)) || 0;
    if (counter === 0) {
        showLoading();
        fetch(`${API_URL}/total-solved`).then(async (response) => {
            const value = await response.text();
            if (value) {
                showSuccess(Number(value));
            }
        }).catch(showError);
    } else {
        showSuccess(counter);
    }
});