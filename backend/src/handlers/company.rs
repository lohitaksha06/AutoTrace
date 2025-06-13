use axum::{Json, Router, routing::post};
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

use crate::models::Company;

pub fn routes(pool: SqlitePool) -> Router {
    Router::new()
        .route("/register", post(register_company).with_state(pool))
}

async fn register_company(
    Json(company): Json<Company>,
    pool: axum::extract::State<SqlitePool>,
) -> Result<Json<Company>, String> {
    // Insert into DB (implement in services)
    crate::services::company::insert_company(&pool, &company)
        .await
        .map(Json)
        .map_err(|e| e.to_string())
}
