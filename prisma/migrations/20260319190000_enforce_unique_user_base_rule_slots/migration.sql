WITH ranked_rules AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, day_of_week
            ORDER BY id
        ) AS row_number
    FROM "UserBaseRule"
)
DELETE FROM "UserBaseRule"
WHERE id IN (
    SELECT id
    FROM ranked_rules
    WHERE row_number > 1
);

CREATE UNIQUE INDEX "UserBaseRule_user_id_day_of_week_key"
ON "UserBaseRule"("user_id", "day_of_week");
