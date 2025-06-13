use sqlx::sqlite::SqlitePool;

pub async fn init_db() -> Result<SqlitePool, sqlx::Error> {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    SqlitePool::connect(&db_url).await
}
