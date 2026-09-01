
// ==========================================
// READ TABLES
// ==========================================

async function getAllSeasons() {

    console.log("admin-data.js: getAllSeasons Called");

    const {data, error} =
        await supabaseClient
            .from("seasons")
            .select(`
                id,
                season_code,
                name,
                total_gameweeks,
                current_gameweek,
                active
            `)
            .order("id", {ascending: false});
    if (error)
        throw error;

    return data.map(row => ({
            id: row.id,
            seasonCode: row.season_code,
            name: row.name,
            totalGameweeks: row.total_gameweeks,
            currentGameweek: row.current_gameweek,
            active: row.active
        })
    );
}

async function getSeason(seasonId) {

    console.log("admin-data.js: getSeason Called");

    const {data, error} =
        await supabaseClient
            .from("seasons")
            .select(`
                id,
                season_code,
                name,
                total_gameweeks,
                current_gameweek,
                active
            `)
            .eq("id", seasonId)
            .single();
    if (error)
        throw error;

    return {
        id: data.id,
        seasonCode: data.season_code,
        name: data.name,
        totalGameweeks: data.total_gameweeks,
        currentGameweek: data.current_gameweek,
        active: data.active
    };
}

async function getActiveSeason() {

    console.log("admin-data.js: getActiveSeason Called");

    const {data, error} =
        await supabaseClient
            .from("seasons")
            .select("*")
            .eq("active", true)
            .single();
    if (error)
        throw error;

    return {
        id: data.id,
        name: data.name,
        seasonCode: data.season_code,
        totalGameweeks: data.total_gameweeks,
        currentGameweek: data.current_gameweek,
        active: data.active,
        scores_last_imported_at: data.scores_last_imported_at,
        captains_last_imported_at: data.captains_last_imported_at
        };

}

async function getSeasonPlayers(seasonId) {

    console.log("admin-data.js: getSeasonPlayers Called");

    const {data, error} =
        await supabaseClient
            .from("season_players")
            .select(`
                id,
                player_id,
                fpl_entry_id,
                fpl_team_name,
                active,
                display_order,
                players (id, name)
            `)
            .eq("season_id", seasonId)
            .eq("active",true)
            .order("display_order");
    if (error)
        throw error;

    return data;
}

async function getAllSeasonPlayers(seasonId) {

    console.log("admin-data.js: getAllSeasonPlayers Called");

    const {data, error} =
        await supabaseClient
            .from("season_players")
            .select(`
                id,
                player_id,
                fpl_entry_id,
                fpl_team_name,
                active,
                players (id, name)
            `)
            .eq("season_id", seasonId);
    if (error)
        throw error;

    return data.sort((a, b) => {
        const nameA = a.players?.name ?? "";
        const nameB = b.players?.name ??"";

            return nameA.localeCompare(nameB);
        }
    );
}

async function getGameweekScores(seasonId, gameweek) {

    console.log("admin-data.js: getGameweekScores Called");

    const {data, error} =
        await supabaseClient
            .from("gameweek_scores")
            .select("*")
            .eq("season_id", seasonId)
            .eq("gameweek", gameweek);

    if (error)
        throw error;

    return data;
}

async function setupCompetitionPeriods(
    seasonId
) {

    console.log(
        "admin-data.js: setupCompetitionPeriods Called",
        seasonId
    );


    // ==========================================
    // CHECK EXISTING PERIODS
    // ==========================================

    const {
        data: existingPeriods,
        error: existingError
    } =
        await supabaseClient
            .from("competition_periods")
            .select(`
                id,
                period_number
            `)
            .eq(
                "season_id",
                seasonId
            );


    if (existingError)
        throw existingError;


    if (
        existingPeriods &&
        existingPeriods.length > 0
    ) {

        throw new Error(
            `This season already has ${existingPeriods.length} competition period(s).`
        );

    }


    // ==========================================
    // BUILD STANDARD PERIODS
    // ==========================================

    const periods = [

        {
            period_number: 1,
            name: "Period 1",
            start_gameweek: 1,
            end_gameweek: 4
        },

        {
            period_number: 2,
            name: "Period 2",
            start_gameweek: 5,
            end_gameweek: 8
        },

        {
            period_number: 3,
            name: "Period 3",
            start_gameweek: 9,
            end_gameweek: 12
        },

        {
            period_number: 4,
            name: "Period 4",
            start_gameweek: 13,
            end_gameweek: 16
        },

        {
            period_number: 5,
            name: "Period 5",
            start_gameweek: 17,
            end_gameweek: 20
        },

        {
            period_number: 6,
            name: "Period 6",
            start_gameweek: 21,
            end_gameweek: 24
        },

        {
            period_number: 7,
            name: "Period 7",
            start_gameweek: 25,
            end_gameweek: 28
        },

        {
            period_number: 8,
            name: "Period 8",
            start_gameweek: 29,
            end_gameweek: 32
        },

        {
            period_number: 9,
            name: "Period 9",
            start_gameweek: 33,
            end_gameweek: 36
        },

        {
            period_number: 10,
            name: "Period 10",
            start_gameweek: 37,
            end_gameweek: 38
        }

    ];


    // Add season ID to every record

    const records =
        periods.map(
            period => ({

                season_id:
                    seasonId,

                ...period

            })
        );


    // ==========================================
    // INSERT PERIODS
    // ==========================================

    const {
        error
    } =
        await supabaseClient
            .from("competition_periods")
            .insert(
                records
            );


    if (error)
        throw error;


    return records.length;

}

async function getPlayers() {

    console.log("admin-data.js: getPlayers Called");

    const {data, error} =
        await supabaseClient
            .from("players")
            .select(`id, name`)
            .order("name");
    if (error)
        throw error;

    return data;
}

async function getSeasonById(
    seasonId
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("seasons")
            .select(`
                id,
                name,
                total_gameweeks,
                current_gameweek,
                active
            `)
            .eq(
                "id",
                seasonId
            )
            .single();


    if (error)
        throw error;


    return data;

}

async function getActivePlayerCount(
    seasonId
) {

    const {
        count,
        error
    } =
        await supabaseClient
            .from("season_players")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "season_id",
                seasonId
            )
            .eq(
                "active",
                true
            );


    if (error)
        throw error;


    return count ?? 0;

}

async function getCompetitionPeriods(
    seasonId
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("competition_periods")
            .select(`
                period_number,
                start_gameweek,
                end_gameweek
            `)
            .eq(
                "season_id",
                seasonId
            )
            .order(
                "period_number"
            );


    if (error)
        throw error;


    return data ?? [];

}

async function getSeasonChips(seasonId) {

    debugLog("admin-data.js: getSeasonChips Called");

    const {data, error} =
        await supabaseClient
            .from("player_chips")
            .select(`id, player_id, gameweek, chip`)
            .eq("season_id", seasonId);
    if (error)
        throw error;

    return data ?? [];
}

async function loadPrizeSettings(
    seasonId
) {

    console.log(
        "admin-data.js: loadPrizeSettings Called",
        seasonId
    );


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "season_prize_settings"
            )
            .select(`
                season_id,
                entry_fee,
                overall_percent,
                period_percent,
                highest_gameweek_percent,
                captain_percent
            `)
            .eq(
                "season_id",
                seasonId
            )
            .maybeSingle();


    if (error)
        throw error;


    return data;

}

async function getGameweekChips(seasonId, gameweek) {

    debugLog("admin-data.js: getGameweekChips Called");

    const {data, error} =
    await supabaseClient
        .from("player_chips")
        .select(`player_id, chip`)
        .eq("season_id", seasonId)
        .eq("gameweek", gameweek);
    if (error)
        throw error;

    return data ?? [];
}

async function getPlayerSeasonScoreData(seasonId, playerId) {

    debugLog("admin-data.js: getScoreData Called");

    const {data, error} =
        await supabaseClient
            .from("gameweek_scores")
            .select("gameweek, adjustment, note")
            .eq("season_id", seasonId)
            .eq("player_id", playerId);
        if (error)
            throw error;

    return data ?? [];
}

async function getCaptainData(seasonId) {

    debugLog("admin-data.js: getCaptainData Called");

    const {data, error} =
    await supabaseClient
        .from("gameweek_scores")
        .select(`
            id,
            player_id,
            gameweek,
            captain_name,
            captain_points,
            captain_multiplier
        `)
        .eq("season_id", seasonId);
    if (error)
        throw error;

    return data ?? [];
}

// ==========================================
// UPDATE TABLES
// ==========================================

async function saveGameweekScore(seasonId, playerId, gameweek, adjustment, note) {

    console.log("admin-data.js: saveGameweekScore Called");

    const {data: existing, error: existingError} =
        await supabaseClient
            .from("gameweek_scores")
            .select(`id, fpl_points`)
            .eq("season_id", seasonId)
            .eq("player_id", playerId)
            .eq("gameweek", gameweek)
            .maybeSingle();
    if (existingError)
        throw existingError;

    // ==========================================
    // EXISTING SCORE
    // ==========================================

    if (existing) {
        const {error} =
            await supabaseClient
                .from("gameweek_scores")
                .update({adjustment: adjustment, note: note})
                .eq("id", existing.id);
        if (error)
            throw error;

        return;
    }

    // ==========================================
    // NEW SCORE RECORD
    // ==========================================

    const {error} =
        await supabaseClient
            .from("gameweek_scores")
            .insert({
                season_id: seasonId,
                player_id: playerId,
                gameweek: gameweek,
                fpl_points: 0,
                adjustment: adjustment,
                note: note
            });
    if (error)
        throw error;
}

async function saveSeasonPlayer(seasonPlayerId, fplEntryId, fplTeamName, active) {

    console.log("admin-data.js: saveSeasonPlayer Called");

    const {error} =
        await supabaseClient
            .from("season_players")
            .update({fpl_entry_id: fplEntryId,
                    fpl_team_name: fplTeamName,
                    active: active})
            .eq("id", seasonPlayerId);
    if (error)
        throw error;
}

async function upsertPlayerSeasonScores(scoreRows) {

    console.log("admin-data.js: upsertPlayerSeasonScores Called");

    const {error} =
        await supabaseClient
            .from("gameweek_scores")
            .upsert(scoreRows, {onConflict: "season_id,player_id,gameweek"});
    if (error)
        throw error;
}

async function upsertPlayerChips(seasonId, playerId, gameweek, chip) {

    console.log("admin-data.js: upsertPlayerChips Called");

    const {error} =
        await supabaseClient
            .from("player_chips")
            .upsert({
                    season_id: seasonId,
                    player_id: playerId,
                    gameweek: gameweek,
                    chip: chip}, {onConflict: "season_id,player_id,gameweek"}
                );
    if (error)
        throw error;

    return error ?? [];
}

async function upsertHistoricalPeriodScores(records) {

    console.log("admin-data.js: upsertHistoricalPeriodScores Called");

    const {error} =
        await supabaseClient
            .from("period_scores")
            .upsert(records, {onConflict: "season_id,period,player_id"});
    if (error)
        throw error;
}

async function savePrizeSettings(
    seasonId,
    settings
) {

    console.log(
        "admin-data.js: savePrizeSettings Called",
        seasonId
    );


    const record = {

        season_id:
            seasonId,

        entry_fee:
            settings.entryFee,

        overall_percent:
            settings.overallPercent,

        period_percent:
            settings.periodPercent,

        highest_gameweek_percent:
            settings.highestGameweekPercent,

        captain_percent:
            settings.captainPercent,

        updated_at:
            new Date().toISOString()

    };


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "season_prize_settings"
            )
            .upsert(
                record,
                {
                    onConflict:
                        "season_id"
                }
            )
            .select()
            .single();


    if (error)
        throw error;


    return data;

}

async function activateSeason(
    seasonId
) {

    const {
        error
    } =
        await supabaseClient
            .rpc(
                "activate_season",
                {
                    target_season_id:
                        seasonId
                }
            );


    if (error)
        throw error;

}

// =================== Season Scores and Captain Import =======================

async function updateScoresTimestamp(importTime, seasonID) {

    debugLog("admin-data.js: updateScoresTimestamp Called");

    const {error} =
        await supabaseClient
            .from("seasons")
            .update({scores_last_imported_at: importTime})
            .eq("id", seasonID);
    if (error)
        throw error;
}

async function updateCaptainData(captainName, captainPoints, captainMultiplier, job) {

    debugLog("admin-data.js: updateCaptainData Called");

    const {error} =
        await supabaseClient
            .from("gameweek_scores")
            .update({
                captain_name: captainName,
                captain_points: captainPoints,
                captain_multiplier: captainMultiplier})
            .eq("id", job.rowId);
    if (error)
        throw error;
}

// ==========================================
// INSERT INTO TABLES
// ==========================================

async function createSeason(
    seasonCode,
    seasonName,
    totalGameweeks,
    currentGameweek
) {

    console.log(
        "admin-data.js: createSeason Called"
    );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("seasons")
            .insert({

                season_code:
                    seasonCode,

                name:
                    seasonName,

                total_gameweeks:
                    totalGameweeks,

                current_gameweek:
                    currentGameweek,

                active:
                    false

            })
            .select()
            .single();


    if (error)
        throw error;


    return data;

}

async function copySeasonPlayers(
    targetSeasonId
) {

    console.log(
        "admin-data.js: copySeasonPlayers Called",
        targetSeasonId
    );


    // ==========================================
    // GET ACTIVE SEASON
    // ==========================================

    const activeSeason =
        await getAdminActiveSeason();


    if (
        activeSeason.id ===
        targetSeasonId
    ) {

        throw new Error(
            "Cannot copy players to the active season."
        );

    }


    // ==========================================
    // GET ACTIVE SEASON PLAYERS
    // ==========================================

    const sourcePlayers =
        await getAdminSeasonPlayers(
            activeSeason.id
        );


    if (
        !sourcePlayers ||
        sourcePlayers.length === 0
    ) {

        throw new Error(
            "The active season has no players to copy."
        );

    }


    // ==========================================
    // CHECK TARGET SEASON PLAYERS
    // ==========================================

    const targetPlayers =
        await getAdminAllSeasonPlayers(
            targetSeasonId
        );


    if (
        targetPlayers.length > 0
    ) {

        throw new Error(
            "The target season already contains players."
        );

    }


    // ==========================================
    // BUILD NEW RECORDS
    // ==========================================

    const records =
        sourcePlayers.map(
            player => ({

                season_id:
                    targetSeasonId,

                player_id:
                    player.player_id,

                fpl_entry_id:
                    player.fpl_entry_id,

                fpl_team_name:
                    player.fpl_team_name,

                active:
                    true,

                display_order:
                    player.display_order ??
                    999

            })
        );


    // ==========================================
    // INSERT
    // ==========================================

    const {
        error
    } =
        await supabaseClient
            .from("season_players")
            .insert(
                records
            );


    if (error)
        throw error;


    return records.length;

}

async function addPlayerToSeason(seasonId, name, fplEntryId, fplTeamName) {

    debugLog("admin-data.js: addPlayerToSeason Called");

    const {data: existingPlayer, error: existingError} =
        await supabaseClient
            .from("players")
            .select(`id, name`)
            .eq("name", name)
            .maybeSingle();
    if (existingError)
        throw existingError;

    let playerId;

    if (existingPlayer) {
        playerId = existingPlayer.id;
    }
    else {
        const {data: newPlayer, error: playerError} =
            await supabaseClient
                .from("players")
                .insert({name: name})
                .select(`id, name`)
                .single();
        if (playerError)
            throw playerError;

        playerId = newPlayer.id;
    }

    // ==========================================
    // PLAYER ALREADY EXISTS
    // ==========================================
    const {data: existingSeasonPlayer, error: seasonPlayerError} =
        await supabaseClient
            .from("season_players")
            .select("id")
            .eq("season_id", seasonId)
            .eq("player_id", playerId)
            .maybeSingle();
    if (seasonPlayerError)
        throw seasonPlayerError;

    if (existingSeasonPlayer) {
        throw new Error("Player is already assigned to this season.");
    }

    // ==========================================
    // ADD TO SEASON
    // ==========================================

    const {error} =
        await supabaseClient
            .from("season_players")
            .insert({season_id: seasonId,
                player_id: playerId,
                fpl_entry_id: fplEntryId,
                fpl_team_name: fplTeamName,
                active: true,
                display_order: 999
            });
    if (error)
        throw error;
}