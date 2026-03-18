-- CreateTable
CREATE TABLE "SearchQueryStat" (
    "id" SERIAL NOT NULL,
    "query" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchQueryStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchQueryStat_query_key" ON "SearchQueryStat"("query");

-- CreateIndex
CREATE INDEX "SearchQueryStat_count_idx" ON "SearchQueryStat"("count");
