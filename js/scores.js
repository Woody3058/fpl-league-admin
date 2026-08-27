
let scorePageSeason = null;

let scorePagePlayers = [];

let fplPlayerLookup = {};


// ==========================================
// STARTUP
// ==========================================

async function startupScores() {

    console.log(
        "scores.js: startupScores Called"
    );


    const loggedIn =
        await requireAdminLogin();


    if (!loggedIn)
        return;


    setActiveAdminNavigation(
        "scores"
    );


    setupAdminLogout();


    try {

        // ======================================
        // ACTIVE SEASON
        // ======================================

        scorePageSeason =
            await getAdminActiveSeason();

        renderImportTimestamps(
            scorePageSeason
        );


        document
            .getElementById(
                "scoreSeasonName"
            )
            .textContent =
            scorePageSeason.name;


        // ======================================
        // PLAYERS
        // ======================================

        scorePagePlayers =
            await getAdminSeasonPlayers(
                scorePageSeason.id
            );


        // ======================================
        // GAMEWEEK SELECTOR
        // ======================================

        populateGameweekSelector(
            scorePageSeason
        );


        // ======================================
        // INITIAL SCORE LOAD
        // ======================================

        await loadScores(
            scorePageSeason.currentGameweek
        );


        // ======================================
        // EVENTS
        // ======================================

        document
            .getElementById(
                "gameweekSelector"
            )
            .addEventListener(
                "change",
                event => {

                    loadScores(
                        Number(
                            event.target.value
                        )
                    );

                }
            );


        document
            .getElementById(
                "importFplButton"
            )
            .addEventListener(
                "click",
                handleFplImport
            );


        document
            .getElementById(
                "importCaptainDataButton"
            )
            .addEventListener(
                "click",
                handleCaptainImport
            );


        console.log(
            "Scores page started successfully."
        );

    }
    catch(error) {

        console.error(
            "Scores page startup failed:",
            error
        );

    }

}

// ==========================================
// GAMEWEEK SELECTOR
// ==========================================

function populateGameweekSelector(
    season
) {

    const selector =
        document.getElementById(
            "gameweekSelector"
        );


    selector.innerHTML = "";


    for (
        let gw = 1;
        gw <= season.totalGameweeks;
        gw++
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            gw;


        option.textContent =
            `GW${gw}`;


        if (
            gw ===
            season.currentGameweek
        ) {

            option.selected =
                true;

        }


        selector.appendChild(
            option
        );

    }

}

// ==========================================
// LOAD SCORES
// ==========================================

async function loadScores(
    gameweek
) {

    console.log(
        "scores.js: loadScores Called",
        gameweek
    );


    try {

        const scoreData =
            await getAdminGameweekScores(
                scorePageSeason.id,
                gameweek
            );


        renderScores(
            scorePagePlayers,
            scoreData,
            gameweek
        );

        await updateGameweekDataStatus(
            gameweek
        );

    }
    catch(error) {

        console.error(
            "Unable to load scores:",
            error
        );

    }

}

// ==========================================
// RENDER SCORES
// ==========================================

function renderScores(
    seasonPlayers,
    scoreData,
    gameweek
) {

    const tbody =
        document.querySelector(
            "#scoreManagementTable tbody"
        );


    tbody.innerHTML = "";


    seasonPlayers.forEach(
        player => {

            const score =
                scoreData.find(
                    row =>
                        row.player_id ===
                        player.player_id
                );


            const fplPoints =
                Number(
                    score?.fpl_points
                ) || 0;


            const adjustment =
                Number(
                    score?.adjustment
                ) || 0;


            const total =
                fplPoints +
                adjustment;


            const row =
                document.createElement(
                    "tr"
                );

                if (adjustment !== 0) {

                    row.classList.add(
                        "score-adjusted-row"
                    );

                }


            row.innerHTML = `

                <td>
                    ${player.players?.name ?? "Unknown"}
                </td>

                <td class="score-fpl">
                    ${fplPoints}
                </td>

                <td>

                    <input
                        type="number"
                        class="score-adjustment"
                        data-player-id="${player.player_id}"
                        value="${adjustment}"
                    >

                </td>

                <td class="score-total">

                    <strong>
                        ${total}
                    </strong>

                </td>

                <td>

                    <input
                        type="text"
                        class="score-note"
                        data-player-id="${player.player_id}"
                        value="${score?.note ?? ""}"
                        placeholder="Optional note"
                    >

                </td>

                <td>

                    <button
                        class="save-score-button"
                        data-player-id="${player.player_id}"
                        data-gameweek="${gameweek}"
                    >
                        Save
                    </button>

                </td>

            `;


            tbody.appendChild(
                row
            );
        }
    );

                // ==========================================
            // SAVE BUTTON EVENTS
            // ==========================================

            document
                .querySelectorAll(
                    ".save-score-button"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            () => {

                                saveScore(

                                    Number(
                                        button.dataset.playerId
                                    ),

                                    Number(
                                        button.dataset.gameweek
                                    )

                                );

                            }
                        );

                    }
                );

}

async function saveScore(
    playerId,
    gameweek
) {

    console.log(
        "scores.js: saveScore Called",
        playerId,
        gameweek
    );


    const adjustmentInput =
        document.querySelector(
            `.score-adjustment[data-player-id="${playerId}"]`
        );


    const noteInput =
        document.querySelector(
            `.score-note[data-player-id="${playerId}"]`
        );


    if (
        !adjustmentInput ||
        !noteInput
    ) {

        console.error(
            "Score inputs not found for player:",
            playerId
        );

        return;

    }


    const adjustment =
        Number(
            adjustmentInput.value
        ) || 0;


    const note =
        noteInput.value.trim();


    try {

        await saveAdminGameweekScore(

            scorePageSeason.id,

            playerId,

            gameweek,

            adjustment,

            note || null

        );


        console.log(
            "Score saved successfully."
        );


        await loadScores(
            gameweek
        );

    }
    catch(error) {

        console.error(
            "Unable to save score:",
            error
        );


        alert(
            "Unable to save score."
        );

    }

}

function showFplImportStatus() {

    const panel =
        document.getElementById(
            "fplImportStatus"
        );

    if (!panel)
        return;


    panel.style.display =
        "block";


    document
        .getElementById(
            "fplImportSummary"
        )
        .textContent =
        "Starting import...";


    document
        .getElementById(
            "fplImportPlayers"
        )
        .innerHTML =
        "";

}


function updateFplImportSummary(
    text
) {

    const summary =
        document.getElementById(
            "fplImportSummary"
        );


    if (summary) {

        summary.textContent =
            text;

    }

}


function updateFplPlayerStatus(
    playerId,
    playerName,
    status,
    message = ""
) {

    const container =
        document.getElementById(
            "fplImportPlayers"
        );


    if (!container)
        return;


    let row =
        document.getElementById(
            `fpl-import-player-${playerId}`
        );


    if (!row) {

        row =
            document.createElement(
                "div"
            );


        row.id =
            `fpl-import-player-${playerId}`;


        row.className =
            "fpl-import-player";


        container.appendChild(
            row
        );

    }


    let icon = "…";


    if (
        status ===
        "importing"
    ) {

        icon = "⏳";

    }
    else if (
        status ===
        "success"
    ) {

        icon = "✓";

    }
    else if (
        status ===
        "retry"
    ) {

        icon = "↻";

    }
    else if (
        status ===
        "skipped"
    ) {

        icon = "—";

    }
    else if (
        status ===
        "failed"
    ) {

        icon = "✗";

    }


    row.className =
        `fpl-import-player fpl-import-${status}`;


    row.innerHTML = `

        <span class="fpl-import-icon">
            ${icon}
        </span>

        <strong>
            ${playerName}
        </strong>

        <span>
            ${message}
        </span>

    `;

}

async function updateCurrentGameweekFromFpl() {

    console.log("Admin.js: updateCurrentGameweekFromFpl Called");

    try {
        const result =
            await supabaseClient.functions.invoke("fpl-history",
                {
                    body: {
                        requestType:
                            "currentGameweek"
                    }
                }
            );

        if (result.error)
            throw result.error;


        const currentGameweek = Number(result.data?.currentGameweek);

        console.log("FPL current gameweek:", currentGameweek);

        // Before GW1 starts, FPL may return 0.
        // In that case, leave Supabase unchanged.

        if (!Number.isInteger(currentGameweek) || currentGameweek < 1) {
            console.log("No active FPL gameweek yet.");
            return false;
        }





        if (
            Array.isArray(
                result.data?.players
            )
        ) {

            fplPlayerLookup =
                {};


            result.data.players.forEach(
                player => {

                    fplPlayerLookup[
                        player.id
                    ] = {

                        id:
                            player.id,

                        name:
                            player.web_name

                    };

                }
            );


            console.log(
                "FPL player lookup loaded:",
                Object.keys(
                    fplPlayerLookup
                ).length
            );

        }





        // ==========================================
        // GET ACTIVE SEASON
        // ==========================================

        const {data: season, error: seasonError} =
            await supabaseClient
                .from("seasons")
                .select(`id, current_gameweek`)
                .eq("active", true)
                .single();

        if (seasonError)
            throw seasonError;


        // ==========================================
        // ALREADY CORRECT
        // ==========================================

        if (
            season.current_gameweek ===
            currentGameweek
        ) {

            console.log(
                `Current gameweek already GW${currentGameweek}.`
            );

            return true;

        }


        // ==========================================
        // UPDATE SEASON
        // ==========================================

        const {
            error: updateError
        } =
            await supabaseClient
                .from("seasons")
                .update({

                    current_gameweek:
                        currentGameweek

                })
                .eq(
                    "id",
                    season.id
                );


        if (updateError)
            throw updateError;


        console.log(
            `Season current gameweek updated to GW${currentGameweek}.`
        );


        return true;

    }
    catch(error) {

        console.error(
            "Unable to update current gameweek:",
            error
        );


        return false;

    }

}

async function importFplPlayer(
    playerId,
    entryId,
    playerName
) {

    console.log(
        "Importing FPL player:",
        playerId,
        entryId,
        playerName
    );


    try {

        // ==========================================
        // GET ACTIVE SEASON
        // ==========================================

        const {
            data: season,
            error: seasonError
        } =
            await supabaseClient
                .from("seasons")
                .select("*")
                .eq(
                    "active",
                    true
                )
                .single();


        if (seasonError)
            throw seasonError;


        // ==========================================
        // GET FPL HISTORY
        // ==========================================

        let data =
            null;

        let lastError =
            null;


        for (
            let attempt = 1;
            attempt <= 5;
            attempt++
        ) {

            try {

                console.log(
                    `FPL request attempt ${attempt} for ${entryId}`
                );


                const result =
                    await supabaseClient.functions.invoke(
                        "fpl-history",
                        {
                            body: {

                                entryId:
                                    entryId

                            }
                        }
                    );


                if (result.error) {

                    // ----------------------------------
                    // TRY TO READ FUNCTION ERROR BODY
                    // ----------------------------------

                    if (
                        result.error.context
                    ) {

                        try {

                            const errorBody =
                                await result.error
                                    .context
                                    .clone()
                                    .json();


                            console.warn(
                                "Edge Function response body:",
                                errorBody
                            );

                        }
                        catch {

                            // Ignore response parsing errors

                        }

                    }


                    throw result.error;

                }


                data =
                    result.data;


                console.log(
                    `FPL request succeeded for ${entryId} on attempt ${attempt}`
                );


                break;

            }
            catch(error) {

                lastError =
                    error;


                console.warn(
                    `FPL request failed for ${entryId}, attempt ${attempt}`,
                    error
                );


                if (
                    attempt < 5
                ) {

                    // ----------------------------------
                    // EXPONENTIAL BACKOFF
                    // ----------------------------------

                    const delay =
                        2000 *
                        Math.pow(
                            2,
                            attempt - 1
                        );


                    const jitter =
                        Math.floor(
                            Math.random() *
                            1000
                        );


                    const waitTime =
                        delay +
                        jitter;


                    console.log(
                        `Waiting ${waitTime} ms before retry...`
                    );


                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                waitTime
                            )
                    );

                }

            }

        }


        if (!data) {

            throw (
                lastError ??
                new Error(
                    "FPL request failed after retries"
                )
            );

        }


        console.log(
            "FPL history received for:",
            playerName,
            data
        );


        // ==========================================
        // GET CURRENT SEASON HISTORY
        // ==========================================

        const history =
            data.current;


        if (
            !Array.isArray(
                history
            ) ||
            history.length === 0
        ) {

            console.log(
                "No completed FPL gameweeks for",
                playerName
            );


            return false;

        }


        console.log(
            "Current season gameweeks:",
            history.length
        );


        // ==========================================
        // IMPORT EACH GAMEWEEK
        // ==========================================

        for (
            const gw of history
        ) {

            console.log(
                "Importing GW",
                gw.event,
                "points:",
                gw.points
            );

            // ======================================
            // CHECK EXISTING SCORE
            // ======================================

            const {
                data: existing,
                error: existingError
            } =
                await supabaseClient
                    .from(
                        "gameweek_scores"
                    )
                    .select(`
                        id,
                        adjustment,
                        note
                    `)
                    .eq(
                        "season_id",
                        season.id
                    )
                    .eq(
                        "player_id",
                        playerId
                    )
                    .eq(
                        "gameweek",
                        gw.event
                    )
                    .maybeSingle();


            if (existingError)
                throw existingError;


            // ======================================
            // EXISTING RECORD
            // ======================================

            if (existing) {

                const {
                    error: updateError
                } =
                    await supabaseClient
                        .from(
                            "gameweek_scores"
                        )
                        .update({

                            fpl_points:
                                gw.points

                        })
                        .eq(
                            "id",
                            existing.id
                        );


                if (updateError)
                    throw updateError;

            }

            // ======================================
            // NEW RECORD
            // ======================================

            else {

                const {
                    error: insertError
                } =
                    await supabaseClient
                        .from(
                            "gameweek_scores"
                        )
                        .insert({

                            season_id:
                                season.id,

                            player_id:
                                playerId,

                            gameweek:
                                gw.event,

                            fpl_points:
                                gw.points,

                            adjustment:
                                0,

                            note:
                                null

                        });


                if (insertError)
                    throw insertError;

            }

        }


        console.log(
            "FPL import complete for:",
            playerName
        );


        return true;

    }
    catch(error) {

        console.error(
            "FPL import failed:",
            error
        );


        throw error;

    }

}

async function importAllFplPlayers() {

    console.log(
        "================================="
    );

    console.log(
        "Starting FPL import for all players"
    );

    console.log(
        "================================="
    );


    try {

        // ==========================================
        // UPDATE CURRENT GAMEWEEK FIRST
        // ==========================================

        console.log(
            "Checking current FPL gameweek..."
        );

        showFplImportStatus();

        updateFplImportSummary(
            "Checking current FPL gameweek..."
        );

        const gameweekUpdated =
            await updateCurrentGameweekFromFpl();

            
            if (!gameweekUpdated) {

                updateFplImportSummary(
                    "Import stopped — no active FPL gameweek."
                );

            }
            else {

                updateFplImportSummary(
                    "Current gameweek confirmed. Starting player import..."
                );

            }


        console.log(
            "Gameweek check complete:",
            gameweekUpdated
        );


        if (!gameweekUpdated) {

            console.warn(
                "Unable to determine current FPL gameweek."
            );

            return {
                imported: 0,
                skipped: 0,
                failed: 0,
                failedPlayers: [],
                gameweekError: true
            };

        }


        console.log(
            "Current gameweek confirmed. Starting player import..."
        );


        // ==========================================
        // GET ACTIVE SEASON
        // ==========================================

        const {
            data: season,
            error: seasonError
        } =
            await supabaseClient
                .from("seasons")
                .select("*")
                .eq(
                    "active",
                    true
                )
                .single();


        if (seasonError)
            throw seasonError;


        // ==========================================
        // GET ACTIVE PLAYERS
        // ==========================================

        const {
            data: seasonPlayers,
            error: playersError
        } =
            await supabaseClient
                .from("season_players")
                .select(`
                    id,
                    player_id,
                    fpl_entry_id,
                    players (
                        id,
                        name
                    )
                `)
                .eq(
                    "season_id",
                    season.id
                )
                .eq(
                    "active",
                    true
                )
                .order(
                    "display_order"
                );


        if (playersError)
            throw playersError;

        // ==========================================
        // LOAD FPL PLAYER LOOKUP
        // ==========================================

        /*const fplPlayerLookup =
            await getFplPlayerLookup();*/


        // ==========================================
        // GAMEWEEK LIVE DATA CACHE
        // ==========================================

        //const gameweekLiveCache =
        //    {};


        // ==========================================
        // COUNTERS
        // ==========================================

        let imported = 0;
        let skipped = 0;

        const failedPlayers = [];


        // ==========================================
        // FIRST PASS
        // ==========================================

        console.log(
            "Starting first import pass..."
        );


        for (
            const player of seasonPlayers
        ) {

            const playerName =
                player.players?.name ??
                `Player ${player.player_id}`;


            // --------------------------------------
            // NO FPL ENTRY ID
            // --------------------------------------

            if (!player.fpl_entry_id) {

                console.warn(
                    "Skipping",
                    playerName,
                    "- no FPL Entry ID"
                );

                updateFplPlayerStatus(
                    player.player_id,
                    playerName,
                    "skipped",
                    "No FPL Entry ID"
                );

                skipped++;

                continue;

            }

            updateFplPlayerStatus(
                player.player_id,
                playerName,
                "importing",
                "Importing..."
            );




            try {

            const success =
                await importFplPlayer(
                    player.player_id,
                    player.fpl_entry_id,
                    player.playerName                  
                );


                if (success) {

                    imported++;

                    updateFplPlayerStatus(
                        player.player_id,
                        playerName,
                        "success",
                        "Imported"
                    );

                }
                else {

                    // No current-season data yet

                    skipped++;

                updateFplPlayerStatus(
                    player.player_id,
                    playerName,
                    "skipped",
                    "No completed gameweek data"
                );

                }

            }
            
            catch(error)
            
             {

                console.warn(
                    `First pass failed for ${playerName}`
                );

                updateFplPlayerStatus(
                    player.player_id,
                    playerName,
                    "retry",
                    "First pass failed — queued for retry"
                );


                failedPlayers.push({

                    playerId:
                        player.player_id,

                    playerName:
                        playerName,

                    entryId:
                        player.fpl_entry_id,

                    error:
                        error

                });

            }


            // ======================================
            // DELAY BEFORE NEXT PLAYER
            // ======================================

                updateFplImportSummary(
                    `Retrying ${failedPlayers.length} failed player(s)...`
                );

            const playerDelay =
                3000 +
                Math.floor(
                    Math.random() *
                    2000
                );


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        playerDelay
                    )
            );

        }


        // ==========================================
        // SECOND PASS
        // ==========================================

        const finalFailures =
            [];


        if (
            failedPlayers.length > 0
        ) {

            console.log(
                "================================="
            );


            console.log(
                `First pass completed with ${failedPlayers.length} failures`
            );


            console.log(
                "Waiting before second pass..."
            );


            updateFplImportSummary(
                `Retrying ${failedPlayers.length} failed player(s)...`
            );


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        10000
                    )
            );


            console.log(
                "Starting second import pass..."
            );


            for (
                const player of failedPlayers
            ) {

                updateFplPlayerStatus(
                    player.playerId,
                    player.playerName,
                    "retry",
                    "Retrying..."
                );


                console.log(
                    `Second-pass retry: ${player.playerName}`
                );


                try {

                    const success =
                        await importFplPlayer(
                            player.playerId,
                            player.entryId,
                            player.playerName
                        );


                    if (success) {

                        imported++;


                        updateFplPlayerStatus(
                            player.playerId,
                            player.playerName,
                            "success",
                            "Imported on retry"
                        );


                        console.log(
                            `Second-pass import succeeded: ${player.playerName}`
                        );

                    }
                    else {

                        skipped++;

                    }

                }
                catch(error) {

                    console.error(
                        `Second-pass import failed: ${player.playerName}`,
                        error
                    );


                    updateFplPlayerStatus(
                        player.playerId,
                        player.playerName,
                        "failed",
                        "Import failed"
                    );


                    finalFailures.push({

                        playerId:
                            player.playerId,

                        playerName:
                            player.playerName,

                        entryId:
                            player.entryId,

                        error:
                            error

                    });

                }


                const retryDelay =
                    2500 +
                    Math.floor(
                        Math.random() *
                        2500
                    );


                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            retryDelay
                        )
                );

            }

        }


        // ==========================================
        // FINAL SUMMARY
        // ==========================================

        //console.clear();

        console.log("=================================");
        console.log("FPL IMPORT COMPLETE");
        console.log("=================================");

        console.log("Imported:", imported);

        console.log("Skipped:", skipped);

        console.log("Failed:", finalFailures.length);


        if (
            finalFailures.length > 0
        ) {

            console.log(
                "Final failed players:"
            );


            finalFailures.forEach(
                player => {

                    console.log(
                        `${player.playerName} (${player.entryId})`
                    );

                }
            );

        }


        updateFplImportSummary(
            `Import complete — Imported: ${imported}, Skipped: ${skipped}, Failed: ${finalFailures.length}`
        );

        return {

            imported:
                imported,

            skipped:
                skipped,

            failed:
                finalFailures.length,

            failedPlayers:
                finalFailures

        };

    }
    catch(error) {

        console.error(
            "FPL import failed:",
            error
        );


        return null;

    }

}

async function handleFplImport() {

    const button =
        document.getElementById(
            "importFplButton"
        );


    button.disabled = true;

    button.innerHTML = `

        <span
            class="fpl-spinner"
        ></span>

        Importing...

    `;


    showFplImportStatus();

    document
        .getElementById(
            "fplImportStatusTitle"
        )
        .textContent =
        "FPL Score Import";


    try {

        const result =
            await importAllFplPlayers();


        if (!result)
            return;


        if (
            result.gameweekError
        ) {

            updateFplImportSummary(
                "Import stopped — no active FPL gameweek."
            );

            return;

        }


        updateFplImportSummary(

            `Import complete — ` +

            `Imported: ${result.imported}, ` +

            `Skipped: ${result.skipped}, ` +

            `Failed: ${result.failed}`

        );


        // Refresh displayed scores after import

        const gameweek =
            Number(
                document
                    .getElementById(
                        "gameweekSelector"
                    )
                    .value
            );


        await loadScores(
            gameweek
        );

        const scoreImportTime =
            new Date().toISOString();


        const {
            error: timestampError
        } =
            await supabaseClient
                .from("seasons")
                .update({

                    scores_last_imported_at:
                        scoreImportTime

                })
                .eq(
                    "id",
                    scorePageSeason.id
                );


        if (timestampError)
            throw timestampError;


        scorePageSeason.scores_last_imported_at =
            scoreImportTime;


        renderImportTimestamps(
            scorePageSeason
        );

    }
    catch(error) {

        console.error(
            "FPL import error:",
            error
        );


        updateFplImportSummary(
            "FPL import failed."
        );

    }
    finally {

        button.disabled = false;

        button.textContent =
            "Import FPL Scores";

    }

}

/*async function getFplPlayerLookup() {

    console.log(
        "scores.js: getFplPlayerLookup Called"
    );


    const result =
        await supabaseClient.functions.invoke(
            "fpl-history",
            {
                body: {
                    requestType:
                        "bootstrapPlayers"
                }
            }
        );


    if (result.error) {

        if (
            result.error.context
        ) {

            try {

                const errorBody =
                    await result.error
                        .context
                        .clone()
                        .json();


                console.error(
                    "bootstrapPlayers Edge Function response:",
                    errorBody
                );

            }
            catch(error) {

                console.error(
                    "Unable to read bootstrapPlayers error body:",
                    error
                );

            }

        }


        throw result.error;

    }


    console.log(
        "Bootstrap players received:",
        result.data.length
    );


    const lookup =
        {};


    result.data.forEach(
        player => {

            lookup[
                player.id
            ] = {

                id:
                    player.id,

                name:
                    player.web_name

            };

        }
    );


    return lookup;

}*/


async function importCaptainData() {

    console.log(
        "scores.js: importCaptainData Called"
    );


    const statusTitle =
        document.getElementById(
            "fplImportStatusTitle"
        );


    if (statusTitle) {

        statusTitle.textContent =
            "Captain Import";

    }


    updateFplImportSummary(
        "Preparing captain import..."
    );


    try {

        // ==========================================
        // GET ACTIVE SEASON
        // ==========================================

        const {
            data: season,
            error: seasonError
        } =
            await supabaseClient
                .from(
                    "seasons"
                )
                .select("*")
                .eq(
                    "active",
                    true
                )
                .single();


        if (seasonError)
            throw seasonError;


        // ==========================================
        // GET ACTIVE PLAYERS
        // ==========================================

        const {
            data: seasonPlayers,
            error: playersError
        } =
            await supabaseClient
                .from(
                    "season_players"
                )
                .select(`
                    player_id,
                    fpl_entry_id,
                    players (
                        name
                    )
                `)
                .eq(
                    "season_id",
                    season.id
                )
                .eq(
                    "active",
                    true
                );


        if (playersError)
            throw playersError;


        // ==========================================
        // GET SCORE ROWS
        // ==========================================

        const {
            data: scoreRows,
            error: scoreError
        } =
            await supabaseClient
                .from(
                    "gameweek_scores"
                )
                .select(`
                    id,
                    player_id,
                    gameweek,
                    captain_name,
                    captain_points,
                    captain_multiplier
                `)
                .eq(
                    "season_id",
                    season.id
                );


        if (scoreError)
            throw scoreError;


        // ==========================================
        // GET EXISTING CHIP DATA
        // ==========================================

        const {
            data: chipRows,
            error: chipError
        } =
            await supabaseClient
                .from(
                    "player_chips"
                )
                .select(`
                    id,
                    player_id,
                    gameweek,
                    chip
                `)
                .eq(
                    "season_id",
                    season.id
                );


        if (chipError)
            throw chipError;


        // ==========================================
        // GET FPL PLAYER LOOKUP
        // ==========================================
        //
        // Captain names come from bootstrap-static.
        // Do NOT continue if this lookup fails.
        // ==========================================

        const playerLookup =
            {};


        let lookupLoaded =
            false;


        const lookupAttempts =
            3;


        for (
            let attempt = 1;
            attempt <= lookupAttempts;
            attempt++
        ) {

            try {

                updateFplImportSummary(
                    `Loading FPL player information — attempt ${attempt}...`
                );


                console.log(
                    `FPL player lookup attempt ${attempt}`
                );


                const lookupResult =
                    await supabaseClient.functions.invoke(
                        "fpl-history",
                        {
                            body: {

                                requestType:
                                    "currentGameweek"

                            }
                        }
                    );


                if (
                    lookupResult.error
                ) {

                    if (
                        lookupResult.error.context
                    ) {

                        try {

                            const errorBody =
                                await lookupResult.error
                                    .context
                                    .clone()
                                    .json();


                            console.warn(
                                "Player lookup Edge Function response:",
                                errorBody
                            );

                        }
                        catch {
                            // Ignore response parsing errors
                        }

                    }


                    throw lookupResult.error;

                }


                const fplPlayers =
                    lookupResult.data?.players ??
                    [];


                if (
                    !Array.isArray(
                        fplPlayers
                    ) ||
                    fplPlayers.length === 0
                ) {

                    throw new Error(
                        "FPL player lookup returned no players"
                    );

                }


                fplPlayers.forEach(
                    player => {

                        playerLookup[
                            Number(
                                player.id
                            )
                        ] = {

                            id:
                                Number(
                                    player.id
                                ),

                            name:
                                player.web_name

                        };

                    }
                );


                lookupLoaded =
                    true;


                console.log(
                    "FPL player lookup loaded:",
                    Object.keys(
                        playerLookup
                    ).length
                );


                break;

            }
            catch(error) {

                console.warn(
                    `FPL player lookup failed on attempt ${attempt}:`,
                    error
                );


                if (
                    attempt <
                    lookupAttempts
                ) {

                    updateFplImportSummary(
                        `FPL player lookup failed — retrying...`
                    );


                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                3000
                            )
                    );

                }

            }

        }


        // ==========================================
        // LOOKUP IS REQUIRED
        // ==========================================

        if (
            !lookupLoaded
        ) {

            throw new Error(
                "Unable to load FPL player names. Captain import stopped."
            );

        }


        // ==========================================
        // LIVE GAMEWEEK DATA CACHE
        // ==========================================

        const gameweekLiveCache =
            {};


        // ==========================================
        // BUILD CAPTAIN IMPORT JOBS
        // ==========================================

        let pendingJobs =
            [];


        let initiallySkipped =
            0;


        seasonPlayers.forEach(
            player => {

                const playerName =
                    player.players?.name ??
                    `Player ${player.player_id}`;


                // ==================================
                // NO FPL ENTRY ID
                // ==================================

                if (
                    !player.fpl_entry_id
                ) {

                    initiallySkipped++;


                    updateFplPlayerStatus(
                        player.player_id,
                        playerName,
                        "skipped",
                        "No FPL Entry ID"
                    );


                    return;

                }


                const playerRows =
                    scoreRows.filter(
                        row =>
                            row.player_id ===
                            player.player_id
                    );


                playerRows.forEach(
                    row => {

                        /*const existingChip =
                            chipRows.find(
                                chipRow =>

                                    chipRow.player_id ===
                                        player.player_id &&

                                    chipRow.gameweek ===
                                        row.gameweek
                            );*/


                        const captainAlreadyImported =
                            Boolean(
                                row.captain_name &&
                                row.captain_multiplier
                            );


                        /*const chipAlreadyImported =
                            Boolean(
                                existingChip
                            );*/


                        // ==================================
                        // SKIP ALREADY COMPLETE ROWS
                        // ==================================
                        //
                        // During the current chip backfill,
                        // a player with captain data but no
                        // chip record is checked again.
                        // ==================================

                        if (
                            captainAlreadyImported
                        ) {

                            initiallySkipped++;


                            updateFplPlayerStatus(
                                player.player_id,
                                playerName,
                                "skipped",
                                `GW${row.gameweek} already imported`
                            );


                            return;

                        }


                        // ==================================
                        // ADD IMPORT JOB
                        // ==================================

                        pendingJobs.push({

                            rowId:
                                row.id,

                            playerId:
                                player.player_id,

                            entryId:
                                player.fpl_entry_id,

                            playerName:
                                playerName,

                            gameweek:
                                row.gameweek

                        });

                    }
                );

            }
        );


        // ==========================================
        // NOTHING TO IMPORT
        // ==========================================

        if (
            pendingJobs.length === 0
        ) {

            updateFplImportSummary(
                "Captain import complete — all captain data is already populated."
            );


            return;

        }


        // ==========================================
        // COUNTERS
        // ==========================================

        let imported =
            0;


        const maxPasses =
            3;


        // ==========================================
        // MULTI-PASS IMPORT
        // ==========================================

        for (
            let pass = 1;
            pass <= maxPasses;
            pass++
        ) {

            if (
                pendingJobs.length === 0
            ) {

                break;

            }


            updateFplImportSummary(
                `Captain import pass ${pass} — ${pendingJobs.length} remaining`
            );


            console.log(
                "================================="
            );

            console.log(
                `CAPTAIN IMPORT PASS ${pass}`
            );

            console.log(
                `Pending: ${pendingJobs.length}`
            );

            console.log(
                "================================="
            );


            // ======================================
            // RANDOMISE RETRY ORDER
            // ======================================

            pendingJobs =
                [...pendingJobs]
                    .sort(
                        () =>
                            Math.random() -
                            0.5
                    );


            const failedJobs =
                [];


            // ======================================
            // PROCESS THIS PASS
            // ======================================

            for (
                const job of pendingJobs
            ) {

                updateFplPlayerStatus(
                    job.playerId,
                    job.playerName,
                    "importing",
                    `GW${job.gameweek} captain — pass ${pass}`
                );


                try {

                    // ==================================
                    // GET CAPTAIN PICK + CHIP
                    // ==================================

                    const captainResult =
                        await supabaseClient.functions.invoke(
                            "fpl-history",
                            {
                                body: {

                                    requestType:
                                        "captainPick",

                                    entryId:
                                        job.entryId,

                                    gameweek:
                                        job.gameweek

                                }
                            }
                        );


                    if (
                        captainResult.error
                    ) {

                        if (
                            captainResult.error.context
                        ) {

                            try {

                                const errorBody =
                                    await captainResult.error
                                        .context
                                        .clone()
                                        .json();


                                console.warn(
                                    `Captain response for ${job.playerName} GW${job.gameweek}:`,
                                    errorBody
                                );

                            }
                            catch {
                                // Ignore response parsing errors
                            }

                        }


                        throw captainResult.error;

                    }


                    const captainData =
                        captainResult.data;


                    // ==================================
                    // CHIP
                    // ==================================

                    const activeChip =
                        captainData.activeChip ??
                        null;


                    const chip =
                        mapFplChip(
                            activeChip
                        );


                    // ==================================
                    // CAPTAIN ID / MULTIPLIER
                    // ==================================

                    const captainElementId =
                        Number(
                            captainData.elementId
                        );


                    const captainMultiplier =
                        Number(
                            captainData.multiplier
                        );


                    if (
                        !Number.isInteger(
                            captainElementId
                        ) ||
                        captainElementId <= 0
                    ) {

                        throw new Error(
                            `Invalid captain element ID for ${job.playerName}`
                        );

                    }


                    // ==================================
                    // CAPTAIN NAME
                    // ==================================

                    const captainPlayer =
                        playerLookup[
                            captainElementId
                        ];


                    if (
                        !captainPlayer ||
                        !captainPlayer.name
                    ) {

                        throw new Error(
                            `Unable to resolve captain element ${captainElementId} for ${job.playerName}`
                        );

                    }


                    const captainName =
                        captainPlayer.name;


                    // ==================================
                    // GET / CACHE LIVE GAMEWEEK DATA
                    // ==================================

                    let liveData =
                        gameweekLiveCache[
                            job.gameweek
                        ];


                    if (!liveData) {

                        const liveResult =
                            await supabaseClient.functions.invoke(
                                "fpl-history",
                                {
                                    body: {

                                        requestType:
                                            "gameweekPlayerData",

                                        gameweek:
                                            job.gameweek

                                    }
                                }
                            );


                        if (
                            liveResult.error
                        ) {

                            throw liveResult.error;

                        }


                        liveData =
                            liveResult.data;


                        if (
                            !Array.isArray(
                                liveData
                            )
                        ) {

                            throw new Error(
                                `Invalid live FPL data for GW${job.gameweek}`
                            );

                        }


                        gameweekLiveCache[
                            job.gameweek
                        ] =
                            liveData;

                    }


                    // ==================================
                    // FIND CAPTAIN SCORE
                    // ==================================

                    const livePlayer =
                        liveData.find(
                            item =>
                                Number(
                                    item.id
                                ) ===
                                captainElementId
                        );


                    if (!livePlayer) {

                        throw new Error(
                            `Captain ${captainName} not found in GW${job.gameweek} live data`
                        );

                    }


                    const basePoints =
                        Number(
                            livePlayer.stats
                                ?.total_points
                        ) || 0;


                    const captainPoints =
                        basePoints *
                        captainMultiplier;


                    // ==================================
                    // SAVE CHIP FIRST
                    // ==================================
                    //
                    // If a real chip was used and the
                    // chip save fails, don't mark the
                    // captain row complete. That lets
                    // the job retry on the next pass.
                    // ==================================

                    if (chip) {

                        const {
                            error: chipSaveError
                        } =
                            await supabaseClient
                                .from(
                                    "player_chips"
                                )
                                .upsert(
                                    {

                                        season_id:
                                            season.id,

                                        player_id:
                                            job.playerId,

                                        gameweek:
                                            job.gameweek,

                                        chip:
                                            chip

                                    },
                                    {
                                        onConflict:
                                            "season_id,player_id,gameweek"
                                    }
                                );


                        if (
                            chipSaveError
                        ) {

                            console.error(
                                `Unable to save chip for ${job.playerName} GW${job.gameweek}:`,
                                chipSaveError
                            );


                            throw chipSaveError;

                        }


                        console.log(
                            `${job.playerName} GW${job.gameweek} chip saved:`,
                            chip
                        );

                    }


                    // ==================================
                    // UPDATE CAPTAIN DATABASE FIELDS
                    // ==================================

                    const {
                        error: updateError
                    } =
                        await supabaseClient
                            .from(
                                "gameweek_scores"
                            )
                            .update({

                                captain_name:
                                    captainName,

                                captain_points:
                                    captainPoints,

                                captain_multiplier:
                                    captainMultiplier

                            })
                            .eq(
                                "id",
                                job.rowId
                            );


                    if (
                        updateError
                    ) {

                        throw updateError;

                    }


                    // ==================================
                    // SUCCESS
                    // ==================================

                    imported++;


                    let statusText =
                        `GW${job.gameweek}: ` +
                        `${captainName} ` +
                        `(${captainPoints} pts)`;


                    if (chip) {

                        statusText +=
                            ` · ${chip}`;

                    }


                    updateFplPlayerStatus(
                        job.playerId,
                        job.playerName,
                        "success",
                        statusText
                    );


                    console.log(
                        `${job.playerName} GW${job.gameweek}:`,
                        captainName,
                        captainPoints,
                        captainMultiplier,
                        chip
                    );

                }
                catch(error) {

                    console.warn(
                        `FPL captain data unavailable for ${job.playerName} GW${job.gameweek}:`,
                        error
                    );


                    failedJobs.push(
                        job
                    );


                    if (
                        pass <
                        maxPasses
                    ) {

                        updateFplPlayerStatus(
                            job.playerId,
                            job.playerName,
                            "retry",
                            `GW${job.gameweek} failed — queued for pass ${pass + 1}`
                        );

                    }
                    else {

                    updateFplPlayerStatus(
                        job.playerId,
                        job.playerName,
                        "failed",
                        `GW${job.gameweek} unavailable from FPL — retry later`
                    );

                    }

                }


                // ==================================
                // SHORT DELAY
                // ==================================

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            1500 +
                            Math.floor(
                                Math.random() *
                                1000
                            )
                        )
                );

            }


            pendingJobs =
                failedJobs;


            // ======================================
            // WAIT BEFORE RETRY PASS
            // ======================================

            if (
                pendingJobs.length > 0 &&
                pass < maxPasses
            ) {

                updateFplImportSummary(
                    `Pass ${pass} complete — ` +
                    `${pendingJobs.length} failed. ` +
                    `Waiting before retry...`
                );


                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            10000
                        )
                );

            }

        }


        // ==========================================
        // FINAL SUMMARY
        // ==========================================

        const failed =
            pendingJobs.length;


        updateFplImportSummary(

            `Captain import complete — ` +

            `Imported: ${imported}, ` +

            `Skipped: ${initiallySkipped}, ` +

            `Failed: ${failed}`

        );


        console.log(
            "Captain import complete:",
            {
                imported,
                skipped:
                    initiallySkipped,
                failed
            }
        );


        if (
            failed > 0
        ) {

            console.log(
                "Remaining captain failures:"
            );


            pendingJobs.forEach(
                job => {

                    console.log(
                        `${job.playerName} GW${job.gameweek}`
                    );

                }
            );

        }


        // ==========================================
        // UPDATE CAPTAIN IMPORT TIMESTAMP
        // ==========================================

        const captainImportTime =
            new Date().toISOString();


        const {
            error: timestampError
        } =
            await supabaseClient
                .from(
                    "seasons"
                )
                .update({

                    captains_last_imported_at:
                        captainImportTime

                })
                .eq(
                    "id",
                    scorePageSeason.id
                );


        if (
            timestampError
        ) {

            throw timestampError;

        }


        scorePageSeason.captains_last_imported_at =
            captainImportTime;


        renderImportTimestamps(
            scorePageSeason
        );

        
        const selectedGameweek =
            Number(
                document
                    .getElementById(
                        "gameweekSelector"
                    )
                    .value
            );


        await updateGameweekDataStatus(
            selectedGameweek
        );




    }
    catch(error) {

        console.error(
            "Captain import failed:",
            error
        );


        updateFplImportSummary(
            `Captain import failed — ${
                error?.message ??
                "Unknown error"
            }`
        );

    }

}

async function handleCaptainImport() {

    console.log(
        "scores.js: handleCaptainImport Called"
    );


    const button =
        document.getElementById(
            "importCaptainDataButton"
        );


    button.disabled =
        true;


    button.innerHTML = `

        <span
            class="fpl-spinner"
        ></span>

        Updating...

    `;


    showFplImportStatus();


    const statusTitle =
        document.getElementById(
            "fplImportStatusTitle"
        );


    if (statusTitle) {

        statusTitle.textContent =
            "Captain Import";

    }


    try {

        await importCaptainData();

    }
    catch(error) {

        console.error(
            "Captain import error:",
            error
        );


        updateFplImportSummary(
            "Captain import failed."
        );

    }
    finally {

        button.disabled =
            false;


        button.textContent =
            "Update Captains";

    }

}

function renderImportTimestamps(
    season
) {

    const scoresElement =
        document.getElementById(
            "scoresLastImported"
        );


    const captainsElement =
        document.getElementById(
            "captainsLastImported"
        );


    if (scoresElement) {

        scoresElement.textContent =
            formatImportTimestamp(
                season.scores_last_imported_at
            );

    }


    if (captainsElement) {

        captainsElement.textContent =
            formatImportTimestamp(
                season.captains_last_imported_at
            );

    }

}

function formatImportTimestamp(
    value
) {

    if (!value)
        return "Never";


    return new Intl.DateTimeFormat(
        "en-GB",
        {
            dateStyle:
                "medium",

            timeStyle:
                "short"
        }
    )
        .format(
            new Date(
                value
            )
        );

}

function mapFplChip(
    activeChip
) {

    switch (
        activeChip
    ) {

        case "wildcard":
            return "WC";

        case "freehit":
            return "FH";

        case "bboost":
            return "BB";

        case "3xc":
            return "TC";

        default:
            return activeChip ?? null;

    }

}

async function updateGameweekDataStatus(
    gameweek
) {

    console.log(
        "scores.js: updateGameweekDataStatus Called",
        gameweek
    );


    try {

        // ======================================
        // SCORE DATA
        // ======================================

        const {
            data: scores,
            error: scoreError
        } =
            await supabaseClient
                .from(
                    "gameweek_scores"
                )
                .select(`
                    player_id,
                    fpl_points,
                    captain_name,
                    captain_points,
                    captain_multiplier
                `)
                .eq(
                    "season_id",
                    scorePageSeason.id
                )
                .eq(
                    "gameweek",
                    gameweek
                );


        if (scoreError)
            throw scoreError;


        // ======================================
        // CHIP DATA
        // ======================================

        const {
            data: chips,
            error: chipError
        } =
            await supabaseClient
                .from(
                    "player_chips"
                )
                .select(`
                    player_id,
                    chip
                `)
                .eq(
                    "season_id",
                    scorePageSeason.id
                )
                .eq(
                    "gameweek",
                    gameweek
                );


        if (chipError)
            throw chipError;


        // ======================================
        // PLAYER COUNT
        // ======================================

        const totalPlayers =
            scorePagePlayers.length;


        // ======================================
        // SCORE COUNT
        // ======================================

        const scoreCount =
            scores.filter(
                score =>
                    score.fpl_points !==
                    null
            ).length;


        // ======================================
        // CAPTAIN COUNT
        // ======================================

        const captainPlayerIds =
            new Set(
                scores
                    .filter(
                        score =>
                            score.captain_name &&
                            score.captain_multiplier !==
                                null
                    )
                    .map(
                        score =>
                            score.player_id
                    )
            );


        const captainCount =
            captainPlayerIds.size;


        // ======================================
        // CHIP COUNT
        // ======================================

        const chipCount =
            chips.length;


        // ======================================
        // MISSING CAPTAIN PLAYERS
        // ======================================

        const missingCaptainPlayers =
            scorePagePlayers.filter(
                player =>
                    !captainPlayerIds.has(
                        player.player_id
                    )
            );


        const missingCaptainNames =
            missingCaptainPlayers.map(
                player =>
                    player.players?.name ??
                    `Player ${player.player_id}`
            );


        // ======================================
        // DISPLAY
        // ======================================

        document
            .getElementById(
                "gameweekScoreStatus"
            )
            .textContent =
            `${scoreCount} / ${totalPlayers} ${
                scoreCount === totalPlayers
                    ? "✓"
                    : "⚠"
            }`;


        const captainStatusElement =
            document.getElementById(
                "gameweekCaptainStatus"
            );


        const captainMissingElement =
            document.getElementById(
                "gameweekCaptainMissing"
            );


        captainStatusElement.textContent =
            `${captainCount} / ${totalPlayers} ${
                captainCount === totalPlayers
                    ? "✓"
                    : "⚠"
            }`;


        if (
            missingCaptainNames.length > 0
        ) {

            captainMissingElement.textContent =
                `Missing: ${missingCaptainNames.join(", ")}`;

        }
        else {

            captainMissingElement.textContent =
                "";

        }


        document
            .getElementById(
                "gameweekChipStatus"
            )
            .textContent =
            chipCount;

    }
    catch(error) {

        console.error(
            "Unable to update gameweek data status:",
            error
        );

    }

}

async function testCaptainPick(
    entryId,
    gameweek
) {

    console.log(
        "Testing captain pick:",
        entryId,
        gameweek
    );


    try {

        const result =
            await supabaseClient.functions.invoke(
                "fpl-history",
                {
                    body: {

                        requestType:
                            "captainPick",

                        entryId:
                            entryId,

                        gameweek:
                            gameweek

                    }
                }
            );


        if (result.error) {

            if (
                result.error.context
            ) {

                try {

                    const errorBody =
                        await result.error
                            .context
                            .clone()
                            .json();


                    console.warn(
                        "Captain Edge Function response body:",
                        errorBody
                    );

                }
                catch(error) {

                    console.warn(
                        "Unable to read Edge Function error body:",
                        error
                    );

                }

            }


            throw result.error;

        }


        console.log(
            "Captain pick response:",
            result.data
        );


        return result.data;

    }
    catch(error) {

        console.error(
            "Captain pick test failed:",
            error
        );


        return null;

    }

}

async function testGameweekPlayerData(
    gameweek,
    elementId
) {

    console.log(
        "Testing gameweek player data:",
        gameweek,
        elementId
    );


    try {

        const result =
            await supabaseClient.functions.invoke(
                "fpl-history",
                {
                    body: {

                        requestType:
                            "gameweekPlayerData",

                        gameweek:
                            gameweek

                    }
                }
            );


        if (result.error) {

            if (
                result.error.context
            ) {

                try {

                    const errorBody =
                        await result.error
                            .context
                            .clone()
                            .json();


                    console.warn(
                        "Gameweek player data error:",
                        errorBody
                    );

                }
                catch(error) {

                    console.warn(
                        "Unable to read error response:",
                        error
                    );

                }

            }


            throw result.error;

        }


        // ======================================
        // FIND PLAYER
        // ======================================

        const player =
            result.data.find(
                item =>
                    item.id ===
                    elementId
            );


        console.log(
            "Gameweek player:",
            player
        );


        if (player) {

            console.log(
                "GW points:",
                player.stats?.total_points
            );

        }


        return player;

    }
    catch(error) {

        console.error(
            "Gameweek player data test failed:",
            error
        );


        return null;

    }

}

// ==========================================
// START
// ==========================================

startupScores();