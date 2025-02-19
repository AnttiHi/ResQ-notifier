// ==UserScript==
// @name         ResQ-notifier
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Alerts when there are ResQ offers from specific restaurants
// @author       https://github.com/AnttiHi
// @match        https://resq-club.com/app/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let targetRestaurants = [];
    let retrievedData = localStorage.getItem('targetRestaurants');
    if (retrievedData) {
        targetRestaurants = JSON.parse(retrievedData);
    }

    const notifiedOfferRowNames = new Set();

    // Request permission to show notifications
    if (Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log('Notification permission granted');
            }
        });
    }

    function showNotification(title, message, offerDiv) {
        if (Notification.permission === "granted") {
            const notification = new Notification(title, {
                body: message,
                silent: false

            });
            notification.onclick = (event) => {
                offerDiv.click();
                window.focus();
            };
        }
    }

    function createButton(providerName) {
        const button = document.createElement('button');
        button.textContent = 'Notify';
        button.setAttribute('data-provider', providerName);
        button.dataset.state = targetRestaurants.includes(providerName) ? 'on' : 'off';
        button.style.backgroundColor = button.dataset.state === 'on' ? 'ForestGreen' : 'Silver';
        button.style.padding = '10px';
        button.style.color = 'white';
        button.style.cursor = 'pointer';
        button.addEventListener("mouseover", function () {
            button.style.backgroundColor = button.dataset.state === 'on' ? 'DarkGreen' : 'DarkGray';
        });
        button.addEventListener("mouseout", function () {
            button.style.backgroundColor = button.dataset.state === 'on' ? 'ForestGreen' : 'Silver';
        });

        button.addEventListener('click', () => {
            if (button.dataset.state === 'off') {
                button.dataset.state = 'on';
                button.style.backgroundColor = 'ForestGreen';
                targetRestaurants.push(providerName);
            } else {
                button.dataset.state = 'off';
                button.style.backgroundColor = 'Silver';
                const index = targetRestaurants.indexOf(providerName);
                if (index > -1) {
                    targetRestaurants.splice(index, 1);
                }
            }
            if (typeof Storage !== "undefined") {
                localStorage.setItem('targetRestaurants', JSON.stringify(targetRestaurants));
            } else {
                console.warn("localStorage not available")
            }

        });
        return button;
    }

    function addButtonToProvider(providerNameDiv) {
        const providerName = providerNameDiv.textContent.trim();

        let existingButton = document.querySelector(`button[data-provider="${providerName}"]`);
        if (existingButton) return;

        const button = createButton(providerName);

        providerNameDiv.insertAdjacentElement('beforebegin', button);
    }

    function checkAndAddButtons() {
        const providerNameDivs = document.querySelectorAll('.providerName');

        providerNameDivs.forEach((providerNameDiv) => {
            addButtonToProvider(providerNameDiv);
        });
    }

    //This fixes the buttons disappearing when the DOM refreshes
    const observer = new MutationObserver(() => {
        checkAndAddButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('click', () => {
        // Add a small delay before checking for new provider names
        setTimeout(() => {
            checkAndAddButtons();
        }, 300);
    });

    function checkForOffers() {
        const offerRows = document.querySelectorAll('.offerRow-content .offerRow-details .offerRowProviderName');
        const restaurants = {};

        offerRows.forEach(offerRowProviderName => {
            if (!offerRowProviderName) return;

            const divText = offerRowProviderName.textContent ? offerRowProviderName.textContent.toLowerCase() : '';

            targetRestaurants.forEach(restaurant => {
                if (divText.includes(restaurant.toLowerCase())) {
                    const offerRow = offerRowProviderName.closest('.offerRow-content');
                    if (offerRow) {
                        let offerRowNames = new Map();
                        offerRow.querySelectorAll('.offerRowName').forEach(offerRowName => {
                            if (offerRowName) {
                                const offerID = offerRow.closest('.offerRow').getAttribute('oid');
                                const offerRowNameText = offerRowName.textContent?.trim() || '';
                                offerRowNames.set(offerID, offerRowNameText);
                            }
                        });

                        for (let [key, value] of offerRowNames) {
                            if (!notifiedOfferRowNames.has(value)) {
                                if (!restaurants[restaurant]) {
                                    restaurants[restaurant] = new Map();
                                }
                                restaurants[restaurant].set(key, value);
                            }
                        }
                    }
                }
            });
        });
        for (const restaurant in restaurants) {
            if (restaurants.hasOwnProperty(restaurant)) {
                const offerList = Array.from(restaurants[restaurant].values()).join(', ');
                if (offerList) {
                    const offerID = Array.from(restaurants[restaurant].keys())[0];
                    const offerDivs = document.querySelectorAll('.offerRow')
                    const offerDiv = Array.from(offerDivs).find(div => div.getAttribute('oid') === offerID);
                    showNotification(`Offers in ${restaurant}`, `${offerList}`, offerDiv);

                    restaurants[restaurant].forEach(offerRowName => {
                        notifiedOfferRowNames.add(offerRowName);
                    });
                }
            }
        }
    }
    setInterval(checkForOffers, 2000);
})();
