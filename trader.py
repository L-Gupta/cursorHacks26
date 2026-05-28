import json
from typing import Any

from datamodel import (
    Listing,
    Observation,
    Order,
    OrderDepth,
    ProsperityEncoder,
    Symbol,
    Trade,
    TradingState,
)


class Logger:
    def __init__(self) -> None:
        self.logs = ""
        self.max_log_length = 3750

    def print(self, *objects: Any, sep: str = " ", end: str = "\n") -> None:
        self.logs += sep.join(map(str, objects)) + end

    def flush(
        self,
        state: TradingState,
        orders: dict[Symbol, list[Order]],
        conversions: int,
        trader_data: str,
    ) -> None:
        base_length = len(
            self.to_json(
                [
                    self.compress_state(state, ""),
                    self.compress_orders(orders),
                    conversions,
                    "",
                    "",
                ]
            )
        )

        max_item_length = (self.max_log_length - base_length) // 3

        print(
            self.to_json(
                [
                    self.compress_state(
                        state,
                        self.truncate(state.traderData, max_item_length),
                    ),
                    self.compress_orders(orders),
                    conversions,
                    self.truncate(trader_data, max_item_length),
                    self.truncate(self.logs, max_item_length),
                ]
            )
        )

        self.logs = ""

    def compress_state(self, state: TradingState, trader_data: str) -> list[Any]:
        return [
            state.timestamp,
            trader_data,
            self.compress_listings(state.listings),
            self.compress_order_depths(state.order_depths),
            self.compress_trades(state.own_trades),
            self.compress_trades(state.market_trades),
            state.position,
            self.compress_observations(state.observations),
        ]

    def compress_listings(self, listings: dict[Symbol, Listing]) -> list[list[Any]]:
        compressed = []
        for listing in listings.values():
            compressed.append([listing.symbol, listing.product, listing.denomination])
        return compressed

    def compress_order_depths(
        self, order_depths: dict[Symbol, OrderDepth]
    ) -> dict[Symbol, list[Any]]:
        compressed = {}
        for symbol, order_depth in order_depths.items():
            compressed[symbol] = [order_depth.buy_orders, order_depth.sell_orders]
        return compressed

    def compress_trades(self, trades: dict[Symbol, list[Trade]]) -> list[list[Any]]:
        compressed = []
        for arr in trades.values():
            for trade in arr:
                compressed.append(
                    [
                        trade.symbol,
                        trade.price,
                        trade.quantity,
                        trade.buyer,
                        trade.seller,
                        trade.timestamp,
                    ]
                )
        return compressed

    def compress_observations(self, observations: Observation) -> list[Any]:
        conversion_observations = {}
        for product, observation in observations.conversionObservations.items():
            conversion_observations[product] = [
                observation.bidPrice,
                observation.askPrice,
                observation.transportFees,
                observation.exportTariff,
                observation.importTariff,
                observation.sugarPrice,
                observation.sunlightIndex,
            ]
        return [observations.plainValueObservations, conversion_observations]

    def compress_orders(
        self, orders: dict[Symbol, list[Order]]
    ) -> list[list[Any]]:
        compressed = []
        for arr in orders.values():
            for order in arr:
                compressed.append([order.symbol, order.price, order.quantity])
        return compressed

    def to_json(self, value: Any) -> str:
        return json.dumps(value, cls=ProsperityEncoder, separators=(",", ":"))

    def truncate(self, value: str, max_length: int) -> str:
        lo, hi = 0, min(len(value), max_length)
        out = ""

        while lo <= hi:
            mid = (lo + hi) // 2
            candidate = value[:mid]
            if len(candidate) < len(value):
                candidate += "..."
            encoded_candidate = json.dumps(candidate)
            if len(encoded_candidate) <= max_length:
                out = candidate
                lo = mid + 1
            else:
                hi = mid - 1

        return out


logger = Logger()


class Trader:
    LIMITS: dict[str, int] = {
        "ASH_COATED_OSMIUM": 80,
        "INTARIAN_PEPPER_ROOT": 80,
    }

    def run(self, state: TradingState) -> tuple[dict[str, list[Order]], int, str]:
        result: dict[str, list[Order]] = {}
        conversions = 0
        data: dict = {}

        if state.traderData:
            try:
                data = json.loads(state.traderData)
            except Exception:
                data = {}

        if "ASH_COATED_OSMIUM" in state.order_depths:
            result["ASH_COATED_OSMIUM"], data = self.trade_ashcoatedosmium(
                state, data
            )

        if "INTARIAN_PEPPER_ROOT" in state.order_depths:
            result["INTARIAN_PEPPER_ROOT"], data = self.trade_intarianpepperroot(
                state, data
            )

        trader_data = json.dumps(data)

        logger.flush(state, result, conversions, trader_data)
        return result, conversions, trader_data

    def trade_ashcoatedosmium(
        self, state: TradingState, data: dict
    ) -> tuple[list[Order], dict]:
        SYMBOL = "ASH_COATED_OSMIUM"
        LIMIT = self.LIMITS[SYMBOL]
        FAIR = 10000
        orders: list[Order] = []

        od = state.order_depths[SYMBOL]
        buy_orders = od.buy_orders
        sell_orders = od.sell_orders

        pos = state.position.get(SYMBOL, 0)
        buy_cap = LIMIT - pos
        sell_cap = LIMIT + pos

        for price in sorted(sell_orders.keys()):
            if price >= FAIR:
                break
            qty = min(abs(sell_orders[price]), buy_cap)
            if qty > 0:
                orders.append(Order(SYMBOL, price, qty))
                buy_cap -= qty

        for price in sorted(buy_orders.keys(), reverse=True):
            if price <= FAIR:
                break
            qty = min(buy_orders[price], sell_cap)
            if qty > 0:
                orders.append(Order(SYMBOL, price, -qty))
                sell_cap -= qty

        if buy_cap > 0:
            bid_price = FAIR - 1
            if buy_orders:
                bid_price = min(FAIR - 1, max(buy_orders.keys()) + 1)
            if sell_orders:
                bid_price = min(bid_price, min(sell_orders.keys()) - 1)
            orders.append(Order(SYMBOL, int(bid_price), buy_cap))

        if sell_cap > 0:
            ask_price = FAIR + 1
            if sell_orders:
                ask_price = max(FAIR + 1, min(sell_orders.keys()) - 1)
            if buy_orders:
                ask_price = max(ask_price, max(buy_orders.keys()) + 1)
            orders.append(Order(SYMBOL, int(ask_price), -sell_cap))

        return orders, data

    def trade_intarianpepperroot(
        self, state: TradingState, data: dict
    ) -> tuple[list[Order], dict]:
        SYMBOL = "INTARIAN_PEPPER_ROOT"
        LIMIT = self.LIMITS[SYMBOL]
        orders: list[Order] = []

        od = state.order_depths[SYMBOL]
        buy_orders = od.buy_orders
        sell_orders = od.sell_orders

        pos = state.position.get(SYMBOL, 0)
        buy_cap = LIMIT - pos
        sell_cap = LIMIT + pos

        if buy_orders and sell_orders:
            fair = (max(buy_orders.keys()) + min(sell_orders.keys())) / 2
        elif buy_orders:
            fair = max(buy_orders.keys())
        elif sell_orders:
            fair = min(sell_orders.keys())
        else:
            fair = 10000

        for price in sorted(sell_orders.keys()):
            if price >= fair:
                break
            qty = min(abs(sell_orders[price]), buy_cap)
            if qty > 0:
                orders.append(Order(SYMBOL, price, qty))
                buy_cap -= qty

        for price in sorted(buy_orders.keys(), reverse=True):
            if price <= fair:
                break
            qty = min(buy_orders[price], sell_cap)
            if qty > 0:
                orders.append(Order(SYMBOL, price, -qty))
                sell_cap -= qty

        if buy_cap > 0:
            bid_price = int(fair - 1)
            if buy_orders:
                bid_price = min(int(fair - 1), max(buy_orders.keys()) + 1)
            if sell_orders:
                bid_price = min(bid_price, min(sell_orders.keys()) - 1)
            orders.append(Order(SYMBOL, int(bid_price), buy_cap))

        if sell_cap > 0:
            ask_price = int(fair + 1)
            if sell_orders:
                ask_price = max(int(fair + 1), min(sell_orders.keys()) - 1)
            if buy_orders:
                ask_price = max(ask_price, max(buy_orders.keys()) + 1)
            orders.append(Order(SYMBOL, int(ask_price), -sell_cap))

        return orders, data
