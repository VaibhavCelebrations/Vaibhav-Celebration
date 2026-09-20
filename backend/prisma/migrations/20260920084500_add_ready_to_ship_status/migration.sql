-- Add READY_TO_SHIP to OrderStatus enum
-- This must be done with ALTER TYPE since PostgreSQL enums cannot be modified inline.
-- We insert READY_TO_SHIP between PROCESSING and SHIPPED to reflect the logical order.

ALTER TYPE "OrderStatus" ADD VALUE 'READY_TO_SHIP' AFTER 'PROCESSING';
