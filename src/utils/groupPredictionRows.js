export function groupPredictionRowsByMatchId(predictionRows = []) {
  return predictionRows.reduce((result, prediction) => {
    const matchId = prediction.match_id;

    if (!result[matchId]) {
      result[matchId] = [];
    }

    result[matchId].push(prediction);
    return result;
  }, {});
}

export function buildGroupMemberPredictionsByMatchId({
  members = [],
  matchIds = [],
  predictionRows = [],
}) {
  const predictionByKey = new Map(
    predictionRows.map((row) => [`${row.match_id}:${row.user_id}`, row]),
  );

  const acceptedMembers = [...members]
    .filter((member) => member.status === "accepted")
    .sort((first, second) =>
      (first.profile?.username ?? "").localeCompare(
        second.profile?.username ?? "",
      ),
    );

  return Object.fromEntries(
    matchIds.map((matchId) => [
      matchId,
      acceptedMembers.map((member) => {
        const row = predictionByKey.get(`${matchId}:${member.user_id}`);

        return {
          match_id: matchId,
          user_id: member.user_id,
          username: member.profile?.username ?? "Unknown player",
          predicted_result: row?.predicted_result ?? null,
          predicted_home_score: row?.predicted_home_score ?? null,
          predicted_away_score: row?.predicted_away_score ?? null,
        };
      }),
    ]),
  );
}
