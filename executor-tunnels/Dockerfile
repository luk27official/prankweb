#
# executor-tunnels
#

FROM ubuntu:24.04

ARG UID=5988
ARG GID=5988
ARG CELERY_BROKER_URL="amqp://user-develop:develop@localhost:5672"
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    wget \
    python3 \
    python3-pip \
    python3-venv \
    mono-complete \
    unzip

# https://github.com/python/cpython/issues/102134
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN groupadd --gid ${GID} user \
    && useradd --uid ${UID} --gid ${GID} user

# Since WORKDIR created with current user (root) we precreate the folders.
RUN mkdir /data \
    && mkdir /data/prankweb && chown user:user /data/prankweb \
    && mkdir /opt/executor-tunnels && chown user:user /opt/executor-tunnels 

# Prankweb executor-tunnels
WORKDIR /opt/executor-tunnels

# Install python dependencies
COPY --chown=user:user ./executor-tunnels/requirements.txt ./
RUN pip3 install -r requirements.txt

COPY --chown=user:user ./executor-tunnels/ ./
RUN chmod a+x ./run_task.py

# Download Mole2_cmd
RUN wget https://webchem.ncbr.muni.cz/Platform/AppsBin/Mole/2.5.24.6.8/Mole2_cmd.zip && \
    unzip Mole2_cmd.zip && \
    rm Mole2_cmd.zip

RUN chmod a+x ./Mole2_cmd/mole2.exe

# Add Mole2_cmd to PATH
ENV PATH="/opt/executor-tunnels/Mole2_cmd:${PATH}"

#
# environment
WORKDIR /opt/executor-tunnels
USER ${UID}:${GID}
