use axum::{Router, routing::post, extract::State, Json, http::StatusCode};
use sqlx::SqlitePool;
use serde_json::json;

use crate::models::company::Company;
use crate::services::company::insert_company;

pub fn routes(pool: SqlitePool) -> Router {
    Router::new()
        .route("/register", post(register_company).with_state(pool))
}

pub async fn register_company(
    State(pool): State<SqlitePool>,
    Json(company): Json<Company>,
) -> (StatusCode, Json<serde_json::Value>) {
    match insert_company(&pool, &company).await {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({ "message": "Company registered successfully" })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}
