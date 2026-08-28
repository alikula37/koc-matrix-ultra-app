"""initial schema

Revision ID: 001_initial
Revises: 
Create Date: 2025-08-28
"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255)),
        sa.Column('is_active', sa.Boolean, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
    )
    op.create_index('ix_users_email', 'users', ['email'])
    # accounts
    op.create_table(
        'accounts',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('base_currency', sa.String(10), server_default='USDT'),
        sa.Column('description', sa.String(500)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
    )
    # setups / indicators / emotions
    for tbl in ['setups','indicators','emotions']:
        op.create_table(
            tbl,
            sa.Column('id', sa.Integer, primary_key=True),
            sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
            sa.Column('name', sa.String(100), nullable=False),
            sa.Column('description', sa.String(500)),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('deleted_at', sa.DateTime(timezone=True)),
        )
    # trades
    op.create_table(
        'trades',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('trade_no', sa.String(50), unique=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('account_id', sa.Integer, sa.ForeignKey('accounts.id'), nullable=False),
        sa.Column('entry_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('exit_date', sa.DateTime(timezone=True)),
        sa.Column('symbol', sa.String(20), nullable=False),
        sa.Column('direction', sa.String(10), nullable=False),
        sa.Column('entry_price', sa.Float, nullable=False),
        sa.Column('stop_loss', sa.Float),
        sa.Column('take_profit_1', sa.Float),
        sa.Column('take_profit_2', sa.Float),
        sa.Column('take_profit_3', sa.Float),
        sa.Column('position_size', sa.Float, nullable=False),
        sa.Column('account_risk_percent', sa.Float),
        sa.Column('leverage', sa.Float),
        sa.Column('margin_used', sa.Float),
        sa.Column('commission_fees', sa.Float, server_default='0'),
        sa.Column('status', sa.String(20), server_default='OPEN'),
        sa.Column('emotions', sa.JSON),
        sa.Column('indicators_used', sa.JSON),
        sa.Column('setups', sa.JSON),
        sa.Column('execution_quality_score', sa.Integer),
        sa.Column('trade_setup_notes', sa.Text),
        sa.Column('chart_snapshot_paths', sa.JSON),
        sa.Column('planned_rr', sa.Float),
        sa.Column('realized_rr', sa.Float),
        sa.Column('net_pnl_cash', sa.Float),
        sa.Column('net_pnl_r', sa.Float),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
    )
    op.create_index('ix_trades_symbol', 'trades', ['symbol'])
    op.create_index('ix_trades_user_id', 'trades', ['user_id'])
    # trade_exits
    op.create_table(
        'trade_exits',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('trade_id', sa.Integer, sa.ForeignKey('trades.id', ondelete='CASCADE'), nullable=False),
        sa.Column('exit_price', sa.Float, nullable=False),
        sa.Column('exit_quantity', sa.Float, nullable=False),
        sa.Column('exit_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('exit_reason', sa.String(30), nullable=False),
        sa.Column('pnl_cash', sa.Float),
        sa.Column('pnl_r', sa.Float),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
    )
    # trade_edit_history
    op.create_table(
        'trade_edit_history',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('trade_id', sa.Integer, sa.ForeignKey('trades.id', ondelete='CASCADE'), nullable=False),
        sa.Column('edited_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('old_data', sa.JSON, nullable=False),
        sa.Column('new_data', sa.JSON, nullable=False),
        sa.Column('diff', sa.JSON),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('channel', sa.String(20), server_default='web_push'),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('body', sa.String(1000), nullable=False),
        sa.Column('payload', sa.JSON),
        sa.Column('is_read', sa.Boolean, server_default='false'),
        sa.Column('sent_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # draft_trades
    op.create_table(
        'draft_trades',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('symbol', sa.String(20), nullable=False),
        sa.Column('signal_type', sa.String(20), nullable=False),
        sa.Column('price', sa.Float, nullable=False),
        sa.Column('sl', sa.Float),
        sa.Column('tp', sa.Float),
        sa.Column('raw_payload', sa.JSON, nullable=False),
        sa.Column('source', sa.String(50), server_default='tradingview'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

def downgrade() -> None:
    op.drop_table('draft_trades')
    op.drop_table('notifications')
    op.drop_table('trade_edit_history')
    op.drop_table('trade_exits')
    op.drop_table('trades')
    for tbl in ['emotions','indicators','setups']:
        op.drop_table(tbl)
    op.drop_table('accounts')
    op.drop_table('users')
