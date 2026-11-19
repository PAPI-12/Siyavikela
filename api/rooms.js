import { redisRooms, roomHttpHandler } from "../server/rooms.js";

// Never use the development memory store in a serverless deployment.
export default roomHttpHandler(redisRooms(process.env));
