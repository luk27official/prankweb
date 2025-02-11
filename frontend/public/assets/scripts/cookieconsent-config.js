import 'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@3.1.0/dist/cookieconsent.umd.js';

/**
 * All config. options available here:
 * https://cookieconsent.orestbida.com/reference/configuration-reference.html
 */
CookieConsent.run({

    root: 'body',
    autoShow: true,
    disablePageInteraction: false,
    hideFromBots: true,
    mode: 'opt-in',

    // https://cookieconsent.orestbida.com/reference/configuration-reference.html#guioptions
    guiOptions: {
        consentModal: {
            layout: 'cloud inline',
            position: 'bottom right',
            equalWeightButtons: true,
            flipButtons: false
        }
    },

    // onFirstConsent: ({ cookie }) => {
    //     console.log('onFirstConsent fired', cookie);
    // },

    // onConsent: ({ cookie }) => {
    //     console.log('onConsent fired!', cookie);
    // },

    // onChange: ({ changedCategories, changedServices }) => {
    //     console.log('onChange fired!', changedCategories, changedServices);
    // },

    categories: {
        analytics: {
            autoClear: {
                cookies: [
                    {
                        name: /^_ga/,   // regex: match all cookies starting with '_ga'
                    },
                    {
                        name: '_gid',   // string: exact cookie name
                    }
                ]
            },

            // https://cookieconsent.orestbida.com/reference/configuration-reference.html#category-services
            services: {
                ga: {
                    label: 'Google Analytics',
                    onAccept: () => { },
                    onReject: () => { }
                }
            }
        }
    },

    language: {
        default: 'en',
        translations: {
            en: {
                consentModal: {
                    title: 'We use cookies',
                    description: 'We store Google Analytics cookies for the purpose of monitoring the website traffic. This is optional.',
                    acceptAllBtn: 'Accept all',
                    acceptNecessaryBtn: 'Reject all',
                    showPreferencesBtn: 'Manage Individual preferences',
                    footer: `
                        <a href="./privacy" target="_blank">Privacy Policy</a>
                    `,
                },
                preferencesModal: {
                    title: 'Manage cookie preferences',
                    acceptAllBtn: 'Accept all',
                    acceptNecessaryBtn: 'Reject all',
                    savePreferencesBtn: 'Accept current selection',
                    closeIconLabel: 'Close modal',
                    serviceCounterLabel: 'Service|Services',
                    sections: [
                        {
                            title: 'Your Privacy Choices',
                            description: `In this panel you can express some preferences related to the processing of your personal information. You may review and change expressed choices at any time by resurfacing this panel via the provided link. To deny your consent to the specific processing activities described below, switch the toggles to off or use the “Reject all” button and confirm you want to save your choices.`,
                        },
                        {
                            title: 'Performance and Analytics',
                            description: 'These cookies collect information about website traffic. All of the data is anonymized and cannot be used to identify you.',
                            linkedCategory: 'analytics',
                            cookieTable: {
                                caption: 'Cookie table',
                                headers: {
                                    name: 'Cookie',
                                    desc: 'Description'
                                },
                                body: [
                                    {
                                        name: '_ga',
                                        desc: 'Google Analytics',
                                    },
                                    {
                                        name: '_gid',
                                        desc: 'Google Analytics',
                                    }
                                ]
                            }
                        },
                        {
                            title: 'More information',
                            description: 'For any queries in relation to my policy on cookies and your choices, please <a href="./about">contact us</a>'
                        }
                    ]
                }
            }
        }
    }
});