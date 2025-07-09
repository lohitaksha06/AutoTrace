use axum::Router;
use sqlx::SqlitePool;

use crate::handlers::company;

pub fn create_routes(pool: SqlitePool) -> Router {
    Router::new()
        .nest("/company", company::routes(pool.clone()))
}
