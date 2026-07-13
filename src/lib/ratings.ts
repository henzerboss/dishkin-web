import { createHash, randomUUID } from 'crypto';
import prisma from '@/lib/prisma';

export const VOTER_COOKIE = 'dishkin_voter';
export const WEB_VOTE_SOURCE = 'web';
export const APP_VOTE_SOURCE = 'app';
export const APP_VOTER_KEY = 'app-origin';

type VoteRow = { value: number };
type AggregateRow = {
  legacyRatingSum: number;
  legacyRatingCount: number | bigint;
  voteSum: number;
  voteCount: number | bigint;
};

type RawDb = {
  recipe: {
    update(args: unknown): Promise<{
      rating: number | null;
      ratingCount: number;
      slug: string;
      locale: string;
    }>;
  };
  $queryRaw<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>;
};

function rawDb(db: unknown): RawDb {
  return db as RawDb;
}

export function voterKey(rawVoterId: string): string {
  return createHash('sha256').update(`dishkin-voter-v1:${rawVoterId}`).digest('hex');
}

export function validVoterId(value: string | undefined): value is string {
  return Boolean(value && value.length >= 20 && value.length <= 120 && /^[a-zA-Z0-9-]+$/.test(value));
}

export function roundRating(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatRating(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined) return '—';
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  } catch {
    return value.toFixed(1).replace(/\.0$/, '');
  }
}

export async function findVote(
  dbInput: unknown,
  recipeId: string,
  source: string,
  hashedVoterKey: string,
): Promise<VoteRow | null> {
  const db = rawDb(dbInput);
  const rows = await db.$queryRaw<VoteRow[]>`
    SELECT "value"
    FROM "RecipeVote"
    WHERE "recipeId" = ${recipeId}
      AND "source" = ${source}
      AND "voterKey" = ${hashedVoterKey}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function insertWebVote(
  txInput: unknown,
  recipeId: string,
  rating: number,
  hashedVoterKey: string,
): Promise<boolean> {
  const tx = rawDb(txInput);
  const inserted = await tx.$executeRaw`
    INSERT OR IGNORE INTO "RecipeVote" ("id", "recipeId", "value", "source", "voterKey", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${recipeId}, ${rating}, ${WEB_VOTE_SOURCE}, ${hashedVoterKey}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  return inserted === 1;
}

export async function setAppVoterVote(
  txInput: unknown,
  recipeId: string,
  rating: number,
  hashedVoterKey: string,
): Promise<void> {
  const tx = rawDb(txInput);
  if (rating > 0) {
    await tx.$executeRaw`
      INSERT INTO "RecipeVote" ("id", "recipeId", "value", "source", "voterKey", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${recipeId}, ${rating}, ${APP_VOTE_SOURCE}, ${hashedVoterKey}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT("recipeId", "source", "voterKey") DO UPDATE SET
        "value" = excluded."value",
        "updatedAt" = CURRENT_TIMESTAMP
    `;
    return;
  }

  await tx.$executeRaw`
    DELETE FROM "RecipeVote"
    WHERE "recipeId" = ${recipeId}
      AND "source" = ${APP_VOTE_SOURCE}
      AND "voterKey" = ${hashedVoterKey}
  `;
}

export async function setAppVote(txInput: unknown, recipeId: string, rating: number): Promise<void> {
  const tx = rawDb(txInput);
  if (rating > 0) {
    await tx.$executeRaw`
      INSERT INTO "RecipeVote" ("id", "recipeId", "value", "source", "voterKey", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${recipeId}, ${rating}, ${APP_VOTE_SOURCE}, ${APP_VOTER_KEY}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT("recipeId", "source", "voterKey") DO UPDATE SET
        "value" = excluded."value",
        "updatedAt" = CURRENT_TIMESTAMP
    `;
    return;
  }

  await tx.$executeRaw`
    DELETE FROM "RecipeVote"
    WHERE "recipeId" = ${recipeId}
      AND "source" = ${APP_VOTE_SOURCE}
      AND "voterKey" = ${APP_VOTER_KEY}
  `;
}

export async function recalculateRecipeRating(txInput: unknown, recipeId: string) {
  const tx = rawDb(txInput);
  const rows = await tx.$queryRaw<AggregateRow[]>`
    SELECT
      r."legacyRatingSum" AS "legacyRatingSum",
      r."legacyRatingCount" AS "legacyRatingCount",
      COALESCE(SUM(v."value"), 0) AS "voteSum",
      COUNT(v."id") AS "voteCount"
    FROM "Recipe" r
    LEFT JOIN "RecipeVote" v ON v."recipeId" = r."id"
    WHERE r."id" = ${recipeId}
    GROUP BY r."id", r."legacyRatingSum", r."legacyRatingCount"
  `;

  const row = rows[0];
  if (!row) throw new Error('recipe_not_found');
  const legacyRatingCount = Number(row.legacyRatingCount);
  const voteCount = Number(row.voteCount);
  const ratingCount = legacyRatingCount + voteCount;
  const ratingSum = Number(row.legacyRatingSum) + Number(row.voteSum);
  const rating = ratingCount > 0 ? roundRating(ratingSum / ratingCount) : null;

  return tx.recipe.update({
    where: { id: recipeId },
    data: { rating, ratingCount },
    select: { rating: true, ratingCount: true, slug: true, locale: true },
  });
}

export async function findWebVote(recipeId: string, rawVoterId: string | undefined) {
  if (!validVoterId(rawVoterId)) return null;
  return findVote(prisma, recipeId, WEB_VOTE_SOURCE, voterKey(rawVoterId));
}
