#!/bin/bash

# Set maximum memory for JVM heap
export JAVA_OPTS="$JAVA_OPTS -Xmx4196m"

# Set paths.
export INSTALL_DIR="/opt/p2rank/"

if [ -n "$CLASSPATH" ]; then
    CLASSPATH="${INSTALL_DIR}/bin/p2rank.jar:${INSTALL_DIR}/bin/lib/*:$CLASSPATH"
else
    CLASSPATH="${INSTALL_DIR}/bin/p2rank.jar:${INSTALL_DIR}/bin/lib/*"
fi

# Determine the Java command to use to start the JVM.
if [ -n "$JAVA_HOME" ] ; then
    JAVACMD="$JAVA_HOME/bin/java"
else
    JAVACMD="java"
fi

# We can ignore all stdout as it is also in the stderr as info level logs.
"$JAVACMD" $JAVA_OPTS -cp "${CLASSPATH}" cz.siret.prank.program.Main -stdout_timestamp "yyyy.MM.dd HH:mm" 1>/dev/null "$@"
