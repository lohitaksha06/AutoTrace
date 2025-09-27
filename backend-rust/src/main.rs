use axum::{routing::{get, post}, Router, Json};
use serde::{Deserialize, Serialize};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Serialize)]
struct Health { ok: bool }

#[derive(Deserialize, Serialize)]
struct Vehicle { vin: String, metadata: serde_json::Value }

async fn health() -> Json<Health> { Json(Health { ok: true }) }

async fn create_vehicle(Json(v): Json<Vehicle>) -> Json<Vehicle> { Json(v) }

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new("info"))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/vehicles", post(create_vehicle));

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", 8080)).await.unwrap();
    tracing::info!("listening", port = 8080);
    axum::serve(listener, app).await.unwrap();
}
