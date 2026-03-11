"use client";

import { useState } from "react";
import Link from "next/link";
import CreateSeasonButton from "@/components/CreateSeasonButton";
import CreateWednesdaySeasonButton from "@/components/CreateWednesdaySeasonButton";
import CreateAdhocSeasonButton from "@/components/CreateAdhocSeasonButton";
import AddAdhocMatchButton from "@/components/AddAdhocMatchButton";
import PairingsTable from "@/components/PairingsTable";
import type { PlayerStats, PairingStats } from "@/lib/scoring";

export interface ActiveSeasonInfo {
  id: number;
  name: string;
  totalMatches: number | null;
  completedCount: number;
  standings: PlayerStats[];
  pairings: PairingStats[];
}

export interface CompletedSeasonInfo {
  id: number;
  name: string;
  totalMatches: number | null;
  createdAt: string;
  completedCount: number;
}

export interface LeagueData {
  activeSeason: ActiveSeasonInfo | null;
  completedSeasons: CompletedSeasonInfo[];
  leagueTally: PlayerStats[];
  leaguePairings: PairingStats[];
}

export interface AdhocLeagueData {
  activeSeason: ActiveSeasonInfo | null;
  completedSeasons: CompletedSeasonInfo[];
  leagueTally: PlayerStats[];
  leaguePairings: PairingStats[];
  allPlayers: { id: number; name: string }[];
}

interface LeagueTabsProps {
  sunday: LeagueData;
  wednesday: LeagueData;
  adhoc: AdhocLeagueData;
}

function StandingsTable({ standings }: { standings: PlayerStats[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rank
            </th>
            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Player
            </th>
            <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Points
            </th>
            <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Played
            </th>
            <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              W-L
            </th>
            <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Games
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {standings.map((stat, index) => (
            <tr
              key={stat.playerId}
              className={index === 0 ? "bg-yellow-50" : ""}
            >
              <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-900">
                {index + 1}
                {index === 0 && " 🏆"}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                {stat.playerName}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                {stat.points}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                {stat.matchesPlayed}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                {stat.wins}-{stat.losses}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                {stat.gamesFor}-{stat.gamesAgainst}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeagueView({
  data,
  isSunday,
}: {
  data: LeagueData;
  isSunday: boolean;
}) {
  const accentColor = isSunday ? "blue" : "purple";
  const noSeasonBg = isSunday
    ? "bg-blue-50 border-blue-200"
    : "bg-purple-50 border-purple-200";
  const leagueLabel = isSunday ? "Sunday League" : "Wednesday League";
  const playersList = isSunday
    ? "Jakub · Joe · Jon · Matt · Charlie"
    : "Jakub · Joe · Matt · Charlie";

  return (
    <div className="space-y-8">
      {/* Active Season */}
      {data.activeSeason ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {data.activeSeason.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {data.activeSeason.completedCount} /{" "}
                {data.activeSeason.totalMatches ?? "?"} matches completed
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2 max-w-md">
                <div
                  className={`bg-${accentColor}-600 h-2 rounded-full transition-all`}
                  style={{
                    width: data.activeSeason.totalMatches
                      ? `${(data.activeSeason.completedCount / data.activeSeason.totalMatches) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
            <Link
              href={`/season/${data.activeSeason.id}`}
              className={`px-4 py-2 bg-${accentColor}-600 text-white rounded-md hover:bg-${accentColor}-700 transition-colors`}
            >
              View Details
            </Link>
          </div>

          {data.activeSeason.standings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Current Standings
              </h3>
              <StandingsTable standings={data.activeSeason.standings} />
              <PairingsTable
                pairings={data.activeSeason.pairings}
                title="Pairing Performance"
                subtitle="How each duo has performed together this season"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            No Active Season
          </h2>
          <p className="text-sm text-gray-500 mb-2">{playersList}</p>
          <p className="text-gray-600 mb-6">
            Create a new {leagueLabel} season to start tracking matches.
          </p>
          {isSunday ? <CreateSeasonButton /> : <CreateWednesdaySeasonButton />}
        </div>
      )}

      {/* Overall League Tally */}
      {data.completedSeasons.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Overall League Tally
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Statistics from {data.completedSeasons.length} completed season(s)
          </p>
          <StandingsTable standings={data.leagueTally} />
          <PairingsTable
            pairings={data.leaguePairings}
            title="All-Time Pairing Performance"
            subtitle="Across all completed seasons"
          />
        </div>
      )}

      {/* Archived Seasons */}
      {data.completedSeasons.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Archived Seasons
          </h2>
          <div className="space-y-3">
            {data.completedSeasons.map((season) => (
              <Link
                key={season.id}
                href={`/season/${season.id}`}
                className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {season.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {season.completedCount}
                      {season.totalMatches ? ` / ${season.totalMatches}` : ""}{" "}
                      matches &bull;{" "}
                      {new Date(season.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdhocLeagueView({ data }: { data: AdhocLeagueData }) {
  return (
    <div className="space-y-8">
      {/* Active Session */}
      {data.activeSeason ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {data.activeSeason.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {data.activeSeason.completedCount} /{" "}
                {data.activeSeason.totalMatches ?? 0} matches played
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AddAdhocMatchButton
                seasonId={data.activeSeason.id}
                players={data.allPlayers}
              />
              <Link
                href={`/season/${data.activeSeason.id}`}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
              >
                View Details
              </Link>
            </div>
          </div>

          {data.activeSeason.standings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Current Standings
              </h3>
              <StandingsTable standings={data.activeSeason.standings} />
              <PairingsTable
                pairings={data.activeSeason.pairings}
                title="Pairing Performance"
                subtitle="How each duo has performed together this session"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            No Active Session
          </h2>
          <p className="text-sm text-gray-500 mb-2">Any players · No fixed schedule</p>
          <p className="text-gray-600 mb-6">
            Start an adhoc session and add matches on the fly with any 4
            players.
          </p>
          <CreateAdhocSeasonButton />
        </div>
      )}

      {/* Overall Tally */}
      {data.completedSeasons.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Overall Tally
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Across {data.completedSeasons.length} completed session(s)
          </p>
          <StandingsTable standings={data.leagueTally} />
          <PairingsTable
            pairings={data.leaguePairings}
            title="All-Time Pairing Performance"
            subtitle="Across all completed sessions"
          />
        </div>
      )}

      {/* Archived Sessions */}
      {data.completedSeasons.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Archived Sessions
          </h2>
          <div className="space-y-3">
            {data.completedSeasons.map((season) => (
              <Link
                key={season.id}
                href={`/season/${season.id}`}
                className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {season.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {season.completedCount} matches played &bull;{" "}
                      {new Date(season.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeagueTabs({
  sunday,
  wednesday,
  adhoc,
}: LeagueTabsProps) {
  const [activeLeague, setActiveLeague] = useState<
    "sunday" | "wednesday" | "adhoc"
  >("sunday");

  const sundayHasActive = !!sunday.activeSeason;
  const wednesdayHasActive = !!wednesday.activeSeason;
  const adhocHasActive = !!adhoc.activeSeason;

  return (
    <div>
      {/* League Tab Selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8">
        <button
          onClick={() => setActiveLeague("sunday")}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
            activeLeague === "sunday"
              ? "bg-white shadow text-blue-700"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>☀️</span>
            <span>Sunday League</span>
            {sundayHasActive && (
              <span
                className="w-2 h-2 rounded-full bg-green-500 inline-block"
                title="Active season"
              />
            )}
          </div>
          <div className="text-xs font-normal text-gray-500 mt-0.5">
            5 players
          </div>
        </button>
        <button
          onClick={() => setActiveLeague("wednesday")}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
            activeLeague === "wednesday"
              ? "bg-white shadow text-purple-700"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>🌙</span>
            <span>Wednesday League</span>
            {wednesdayHasActive && (
              <span
                className="w-2 h-2 rounded-full bg-green-500 inline-block"
                title="Active season"
              />
            )}
          </div>
          <div className="text-xs font-normal text-gray-500 mt-0.5">
            4 players
          </div>
        </button>
        <button
          onClick={() => setActiveLeague("adhoc")}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
            activeLeague === "adhoc"
              ? "bg-white shadow text-orange-700"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>🎲</span>
            <span>Adhoc</span>
            {adhocHasActive && (
              <span
                className="w-2 h-2 rounded-full bg-green-500 inline-block"
                title="Active session"
              />
            )}
          </div>
          <div className="text-xs font-normal text-gray-500 mt-0.5">
            Any players
          </div>
        </button>
      </div>

      {/* League Content */}
      {activeLeague === "sunday" ? (
        <LeagueView data={sunday} isSunday={true} />
      ) : activeLeague === "wednesday" ? (
        <LeagueView data={wednesday} isSunday={false} />
      ) : (
        <AdhocLeagueView data={adhoc} />
      )}
    </div>
  );
}
