// ==UserScript==
// @name         ResQ-notifier
// @namespace    http://tampermonkey.net/
// @version      1.0
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

    function showNotification(title, message) {
        if (Notification.permission === "granted") {
            const notification = new Notification(title, {
                body: message,
                silent: false
            });
        }
    }

    function createButton(providerName) {
        const button = document.createElement('button');
        button.textContent = 'Notify';
        button.setAttribute('data-provider', providerName);
        button.dataset.state = targetRestaurants.includes(providerName) ? 'on' : 'off';
        button.style.backgroundColor = button.dataset.state === 'on' ? 'green' : 'gray';
        button.style.padding = '10px';
        button.style.color = 'white';

        button.addEventListener('click', () => {
            if (button.dataset.state === 'off') {
                button.dataset.state = 'on';
                button.style.backgroundColor = 'green';
                targetRestaurants.push(providerName);
            } else {
                button.dataset.state = 'off';
                button.style.backgroundColor = 'gray';
                const index = targetRestaurants.indexOf(providerName);
                if (index > -1) {
                    targetRestaurants.splice(index, 1);
                }
            }
            localStorage.setItem('targetRestaurants', JSON.stringify(targetRestaurants));
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
                        const offerRowNames = [];
                        offerRow.querySelectorAll('.offerRowName').forEach(offerRowName => {
                            if (offerRowName) {
                                const offerRowNameText = offerRowName.textContent?.trim() || '';
                                offerRowNames.push(offerRowNameText);
                            }
                        });

                        offerRowNames.forEach(offerRowName => {
                            if (!notifiedOfferRowNames.has(offerRowName)) {
                                if (!restaurants[restaurant]) {
                                    restaurants[restaurant] = [];
                                }
                                restaurants[restaurant].push(offerRowName);
                            }
                        });
                    }
                }
            });
        });

        for (const restaurant in restaurants) {
            if (restaurants.hasOwnProperty(restaurant)) {
                const offerList = restaurants[restaurant].join(', ');
                if (offerList) {
                    showNotification(`Offers in "${restaurant}": "${offerList}"`);

                    restaurants[restaurant].forEach(offerRowName => {
                        notifiedOfferRowNames.add(offerRowName);
                    });
                }
            }
        }
    }
    setInterval(checkForOffers, 2000);
})();
