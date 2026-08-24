
let prizePageSeason = null;

let prizePlayerCount = 0;


// ==========================================
// STARTUP
// ==========================================

async function startupPrizes() {

    console.log(
        "prizes.js: startupPrizes Called"
    );


    try {

        const loggedIn =
            await requireAdminLogin();


        if (!loggedIn)
            return;


        setupAdminLogout();


        setActiveAdminNavigation(
            "prizes"
        );


        // ======================================
        // ACTIVE SEASON
        // ======================================

        prizePageSeason =
            await getAdminActiveSeason();


        document
            .getElementById(
                "prizeSeasonName"
            )
            .textContent =
            prizePageSeason.name;


        // ======================================
        // ACTIVE PLAYER COUNT
        // ======================================

        prizePlayerCount =
            await getAdminActivePlayerCount(
                prizePageSeason.id
            );


        document
            .getElementById(
                "prizePlayerCount"
            )
            .textContent =
            prizePlayerCount;


        // ======================================
        // LOAD SETTINGS
        // ======================================

        const settings =
            await loadPrizeSettings(
                prizePageSeason.id
            );


        populatePrizeSettings(
            settings
        );


        setupPrizeEvents();


        updatePrizePreview();


        console.log(
            "Prize settings page started successfully."
        );

    }
    catch(error) {

        console.error(
            "Prize settings startup failed:",
            error
        );


        document
            .getElementById(
                "prizeSettingsMessage"
            )
            .textContent =
            "Unable to load prize settings.";

    }

}


// ==========================================
// POPULATE SETTINGS
// ==========================================

function populatePrizeSettings(
    settings
) {

    document
        .getElementById(
            "entryFee"
        )
        .value =
        settings?.entry_fee ??
        50;


    document
        .getElementById(
            "overallPercent"
        )
        .value =
        settings?.overall_percent ??
        40;


    document
        .getElementById(
            "periodPercent"
        )
        .value =
        settings?.period_percent ??
        40;


    document
        .getElementById(
            "highestGameweekPercent"
        )
        .value =
        settings?.highest_gameweek_percent ??
        10;


    document
        .getElementById(
            "captainPercent"
        )
        .value =
        settings?.captain_percent ??
        10;

}


// ==========================================
// EVENTS
// ==========================================

function setupPrizeEvents() {

    const inputs = [

        "entryFee",
        "overallPercent",
        "periodPercent",
        "highestGameweekPercent",
        "captainPercent"

    ];


    inputs.forEach(
        id => {

            document
                .getElementById(
                    id
                )
                .addEventListener(
                    "input",
                    updatePrizePreview
                );

        }
    );


    document
        .getElementById(
            "savePrizeSettingsButton"
        )
        .addEventListener(
            "click",
            saveCurrentPrizeSettings
        );

}


// ==========================================
// READ FORM
// ==========================================

function getPrizeFormValues() {

    return {

        entryFee:
            Number(
                document
                    .getElementById(
                        "entryFee"
                    )
                    .value
            ) || 0,

        overallPercent:
            Number(
                document
                    .getElementById(
                        "overallPercent"
                    )
                    .value
            ) || 0,

        periodPercent:
            Number(
                document
                    .getElementById(
                        "periodPercent"
                    )
                    .value
            ) || 0,

        highestGameweekPercent:
            Number(
                document
                    .getElementById(
                        "highestGameweekPercent"
                    )
                    .value
            ) || 0,

        captainPercent:
            Number(
                document
                    .getElementById(
                        "captainPercent"
                    )
                    .value
            ) || 0

    };

}


// ==========================================
// PREVIEW
// ==========================================

function updatePrizePreview() {

    const values =
        getPrizeFormValues();


    const totalPercent =
        values.overallPercent +
        values.periodPercent +
        values.highestGameweekPercent +
        values.captainPercent;


    document
        .getElementById(
            "prizePercentTotal"
        )
        .textContent =
        `${totalPercent}%`;


    const pot =
        prizePlayerCount *
        values.entryFee;


    document
        .getElementById(
            "prizePot"
        )
        .textContent =
        formatCurrency(
            pot
        );


    const overall =
        pot *
        values.overallPercent /
        100;


    const periodFund =
        pot *
        values.periodPercent /
        100;


    const highestGameweek =
        pot *
        values.highestGameweekPercent /
        100;


    const captain =
        pot *
        values.captainPercent /
        100;


    document
        .getElementById(
            "previewOverall"
        )
        .textContent =
        formatCurrency(
            overall
        );


    document
        .getElementById(
            "previewPeriodFund"
        )
        .textContent =
        formatCurrency(
            periodFund
        );


    document
        .getElementById(
            "previewPeriodEach"
        )
        .textContent =
        `${formatCurrency(
            periodFund / 10
        )} per period`;


    document
        .getElementById(
            "previewHighestGameweek"
        )
        .textContent =
        formatCurrency(
            highestGameweek
        );


    document
        .getElementById(
            "previewCaptain"
        )
        .textContent =
        formatCurrency(
            captain
        );

}


// ==========================================
// SAVE
// ==========================================

async function saveCurrentPrizeSettings() {

    console.log(
        "prizes.js: saveCurrentPrizeSettings Called"
    );


    const message =
        document.getElementById(
            "prizeSettingsMessage"
        );


    message.textContent =
        "";


    const values =
        getPrizeFormValues();


    const totalPercent =
        values.overallPercent +
        values.periodPercent +
        values.highestGameweekPercent +
        values.captainPercent;


    // ======================================
    // VALIDATION
    // ======================================

    if (
        values.entryFee < 0
    ) {

        message.textContent =
            "Entry fee cannot be negative.";

        return;

    }


    if (
        Math.abs(
            totalPercent - 100
        ) > 0.001
    ) {

        message.textContent =
            `Prize percentages must total 100%. Current total: ${totalPercent}%.`;

        return;

    }


    try {

        await savePrizeSettings(
            prizePageSeason.id,
            values
        );


        message.textContent =
            "Prize settings saved successfully.";


        updatePrizePreview();

    }
    catch(error) {

        console.error(
            "Unable to save prize settings:",
            error
        );


        message.textContent =
            "Unable to save prize settings.";

    }

}


// ==========================================
// CURRENCY
// ==========================================

function formatCurrency(
    value
) {

    return new Intl.NumberFormat(
        "en-GB",
        {
            style:
                "currency",

            currency:
                "GBP"
        }
    )
        .format(
            value
        );

}


// ==========================================
// START
// ==========================================

startupPrizes();