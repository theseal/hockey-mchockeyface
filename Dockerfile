FROM python:3.13-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /uvx /bin/

ADD . /app

WORKDIR /app

RUN uv sync --locked

CMD ["uv","run","gunicorn","--bind","0.0.0.0:5000","--workers","1","--threads","4","--timeout","120","hockey-mchockeyface:app"]
