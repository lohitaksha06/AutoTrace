use axum::{Router, routing::get};
use std::net::SocketAddr;

mod routes;
mod db;

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    let pool = db::init_db().await.unwrap(); // DB connection

    let app = routes::create_routes(pool);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Server running on {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
