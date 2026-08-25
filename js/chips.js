
let chipPageSeason =
    null;

let chipPagePlayers =
    [];

let chipPageData =
    [];


// ==========================================
// STARTUP
// ==========================================

async function startupChips() {

    console.log(
        "chips.js: startupChips Called"
    );


    const loggedIn =
        await requireAdminLogin();


    if (!loggedIn)
        return;


    setActiveAdminNavigation(
        "chips"
    );


    setupAdminLogout();


    try {

        // ======================================
        // ACTIVE SEASON
        // ======================================

        chipPageSeason =
            await getAdminActiveSeason();


        document
            .getElementById(
                "chipSeasonName"
            )
            .textContent =
            chipPageSeason.name;


        // ======================================
        // PLAYERS
        // ======================================

        chipPagePlayers =
            await getAdminSeasonPlayers(
                chipPageSeason.id
            );


        // ======================================
        // CHIP DATA
        // ======================================

        chipPageData =
            await getAdminSeasonChips(
                chipPageSeason.id
            );


        // ======================================
        // RENDER
        // ======================================

        renderChipOverview();


        console.log(
            "Chips page started successfully."
        );

    }
    catch(error) {

        console.error(
            "Chips page startup failed:",
            error
        );

    }

}


// ==========================================
// RENDER CHIP OVERVIEW
// ==========================================

function renderChipOverview() {

    console.log(
        "chips.js: renderChipOverview Called"
    );


    const tbody =
        document.querySelector(
            "#chipOverviewTable tbody"
        );


    if (!tbody)
        return;


    tbody.innerHTML =
        "";


    chipPagePlayers.forEach(
        player => {

            const playerId =
                player.player_id;


            const playerName =
                player.players?.name ??
                "Unknown";


            const chips =
                chipPageData.filter(
                    row =>
                        row.player_id ===
                        playerId
                );


            const wildcard =
                getChipGameweek(
                    chips,
                    "WC"
                );


            const freeHit =
                getChipGameweek(
                    chips,
                    "FH"
                );


            const benchBoost =
                getChipGameweek(
                    chips,
                    "BB"
                );


            const tripleCaptain =
                getChipGameweek(
                    chips,
                    "TC"
                );


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${playerName}
                </td>

                <td>
                    ${wildcard}
                </td>

                <td>
                    ${freeHit}
                </td>

                <td>
                    ${benchBoost}
                </td>

                <td>
                    ${tripleCaptain}
                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


// ==========================================
// GET CHIP GAMEWEEK
// ==========================================

function getChipGameweek(
    chips,
    chipCode
) {

    const matches =
        chips
            .filter(
                row =>
                    row.chip ===
                    chipCode
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.gameweek -
                    b.gameweek
            );


    const set1 =
        matches[0]
            ? `GW${matches[0].gameweek}`
            : "—";


    const set2 =
        matches[1]
            ? `GW${matches[1].gameweek}`
            : "—";


    return `

        <div class="chip-set">

            <span>
                Set 1
            </span>

            <strong>
                ${set1}
            </strong>

        </div>

        <div class="chip-set">

            <span>
                Set 2
            </span>

            <strong>
                ${set2}
            </strong>

        </div>

    `;

}


// ==========================================
// START
// ==========================================

startupChips();