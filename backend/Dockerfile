# Build stage
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY .mvn ./.mvn
COPY mvnw ./
COPY mvnw.cmd ./
COPY pom.xml .
COPY src ./src
RUN chmod +x mvnw \
    && ./mvnw -q -DskipTests package \
    && jar tf target/backend-0.0.1-SNAPSHOT.jar | grep "BOOT-INF/lib/postgresql-"

# Runtime stage
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app

# Copy the jar from build stage
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Expose port
EXPOSE 8080

# Use environment variable for JVM options if needed
ENV JWT_SECRET=""
ENV RAZORPAY_KEY_ID=""
ENV RAZORPAY_SECRET=""
ENV SPRING_DATASOURCE_URL=""
ENV SPRING_DATASOURCE_USERNAME=""
ENV SPRING_DATASOURCE_PASSWORD=""

ENTRYPOINT ["java", "--enable-preview", "-jar", "app.jar"]
